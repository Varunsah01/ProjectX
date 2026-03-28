import { getNextNumber } from "@/lib/actions/helpers";
import { addBillingCycle, formatBillingCycleLabel, startOfDay } from "@/lib/billing";
import { db } from "@/lib/db";
import { notifyInvoiceCreated } from "@/lib/notifications";

function addDays(value: Date, days: number) {
  const next = startOfDay(value);
  next.setDate(next.getDate() + days);
  return next;
}

function formatPeriodDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface RecurringInvoiceGenerationResult {
  count: number;
  invoiceIds: string[];
  contractIds: string[];
}

export async function generateRecurringInvoices(
  referenceDate = new Date(),
): Promise<RecurringInvoiceGenerationResult> {
  const today = startOfDay(referenceDate);
  const dueContracts = await db.contract.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: {
        lte: today,
      },
    },
    include: {
      plan: {
        select: {
          name: true,
        },
      },
      asset: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { organizationId: "asc" },
      { nextBillingDate: "asc" },
      { createdAt: "asc" },
    ],
  });

  const invoiceIds: string[] = [];
  const contractIds = new Set<string>();

  for (const contract of dueContracts) {
    let billingDate = startOfDay(contract.nextBillingDate);
    let lastBilledDate = contract.lastBilledDate
      ? startOfDay(contract.lastBilledDate)
      : null;
    let generatedForContract = false;

    while (billingDate <= today && billingDate <= contract.endDate) {
      const nextCycleDate = addBillingCycle(billingDate, contract.billingCycle);
      const periodEnd = new Date(
        Math.min(
          addDays(nextCycleDate, -1).getTime(),
          contract.endDate.getTime(),
        ),
      );
      const invoiceNumber = await getNextNumber(
        "INV",
        contract.organizationId,
        "invoice",
      );
      const invoice = await db.invoice.create({
        data: {
          organizationId: contract.organizationId,
          invoiceNumber,
          customerId: contract.customerId,
          contractId: contract.id,
          amount: contract.value,
          paidAmount: 0,
          dueDate: addDays(billingDate, 15),
          issuedDate: billingDate,
          status: "ISSUED",
          type: "RECURRING",
          notes: `Auto-generated recurring invoice for ${contract.contractNumber}.`,
          items: {
            create: [
              {
                organizationId: contract.organizationId,
                description: `${contract.plan.name} (${formatBillingCycleLabel(contract.billingCycle)}) for ${contract.asset.name} · ${formatPeriodDate(billingDate)} to ${formatPeriodDate(periodEnd)}`,
                qty: 1,
                rate: contract.value,
                amount: contract.value,
              },
            ],
          },
        },
      });

      invoiceIds.push(invoice.id);
      contractIds.add(contract.id);
      generatedForContract = true;
      lastBilledDate = billingDate;
      billingDate = nextCycleDate;

      await notifyInvoiceCreated(invoice.id);
    }

    if (generatedForContract && lastBilledDate) {
      await db.contract.update({
        where: {
          id: contract.id,
        },
        data: {
          lastBilledDate,
          nextBillingDate: billingDate,
        },
      });
    }
  }

  return {
    count: invoiceIds.length,
    invoiceIds,
    contractIds: [...contractIds],
  };
}

