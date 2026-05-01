import * as Sentry from "@sentry/nextjs";
import { getNextNumber } from "@/lib/actions/helpers";
import { addBillingCycle, formatBillingCycleLabel, startOfDay } from "@/lib/billing";
import { db } from "@/lib/db";
import { notifyInvoiceCreated } from "@/lib/notifications";
import { recalculateInvoice } from "@/lib/tax/invoice-totals";

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
          hsnSac: true,
          gstRatePercent: true,
          gstApplicable: true,
        },
      },
      asset: {
        select: {
          name: true,
        },
      },
      organization: {
        select: {
          placeOfBusinessState: true,
        },
      },
      customer: {
        select: {
          billingState: true,
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
    try {
      let billingDate = startOfDay(contract.nextBillingDate);
      let lastBilledDate = contract.lastBilledDate
        ? startOfDay(contract.lastBilledDate)
        : null;
      let generatedForContract = false;

      const supplierState = contract.organization.placeOfBusinessState || "";
      const buyerState = contract.customer.billingState || "";
      const gstApplicable = contract.plan.gstApplicable;
      const gstRatePercent = gstApplicable ? Number(contract.plan.gstRatePercent) : 0;
      const hsnSac = contract.plan.hsnSac;

      while (billingDate <= today && billingDate <= contract.endDate) {
      const nextCycleDate = addBillingCycle(billingDate, contract.billingCycle);
      const periodEnd = new Date(
        Math.min(
          addDays(nextCycleDate, -1).getTime(),
          contract.endDate.getTime(),
        ),
      );

      // Compute GST for this invoice
      const canComputeGst =
        gstApplicable && supplierState.length === 2 && buyerState.length === 2;
      const result = canComputeGst
        ? recalculateInvoice({
            items: [{ qty: 1, rate: contract.value, hsnSac, gstRatePercent }],
            supplierState,
            buyerState,
          })
        : null;

      const totalAmount = result ? result.totalAmount : contract.value;

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
          amount: totalAmount,
          paidAmount: 0,
          placeOfSupply: result?.placeOfSupply ?? null,
          isInterState: result?.isInterState ?? null,
          subtotalAmount: result?.subtotalAmount ?? contract.value,
          cgstAmount: result?.cgstAmount ?? (gstApplicable ? null : 0),
          sgstAmount: result?.sgstAmount ?? (gstApplicable ? null : 0),
          igstAmount: result?.igstAmount ?? (gstApplicable ? null : 0),
          totalTaxAmount: result?.totalTaxAmount ?? (gstApplicable ? null : 0),
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
                hsnSac,
                gstRatePercent,
                taxableAmount: contract.value,
                cgstAmount: result?.items[0]?.cgstAmount ?? 0,
                sgstAmount: result?.items[0]?.sgstAmount ?? 0,
                igstAmount: result?.items[0]?.igstAmount ?? 0,
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
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          job: "recurring-invoices",
          contractId: contract.id,
          organizationId: contract.organizationId,
        },
      });
      // record and continue — don't abort the loop on one org's failure
    }
  }

  return {
    count: invoiceIds.length,
    invoiceIds,
    contractIds: [...contractIds],
  };
}
