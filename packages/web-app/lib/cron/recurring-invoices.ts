import * as Sentry from "@sentry/nextjs";
import { getNextNumber } from "@/lib/actions/helpers";
import { addBillingCycle, formatBillingCycleLabel, startOfDay } from "@/lib/billing";
import { db } from "@/lib/db";
import { withCronLock, type CronLockResult } from "@/lib/cron/lock";
import { logger } from "@/lib/log";
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

export type RecurringInvoiceStats = {
  count: number;
  invoiceIds: string[];
  contractIds: string[];
  failed: Record<string, string>;
};

export type RecurringInvoiceGenerationResult = CronLockResult<RecurringInvoiceStats>;

export async function generateRecurringInvoices(
  referenceDate = new Date(),
): Promise<RecurringInvoiceGenerationResult> {
  return withCronLock("generate-invoices", async () => {
    const start = Date.now();
    logger.info(
      { event: "cron.start", name: "generate-invoices" },
      "cron starting",
    );

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
    const failed: Record<string, string> = {};

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

        // Pre-generate invoice numbers and data outside the transaction
        const invoiceBatch: Array<{
          invoiceNumber: string;
          billingDate: Date;
          periodEnd: Date;
          totalAmount: number;
          gstResult: ReturnType<typeof recalculateInvoice> | null;
        }> = [];

        while (billingDate <= today && billingDate <= contract.endDate) {
          const nextCycleDate = addBillingCycle(billingDate, contract.billingCycle);
          const periodEnd = new Date(
            Math.min(
              addDays(nextCycleDate, -1).getTime(),
              contract.endDate.getTime(),
            ),
          );

          const canComputeGst =
            gstApplicable && supplierState.length === 2 && buyerState.length === 2;
          const gstResult = canComputeGst
            ? recalculateInvoice({
                items: [{ qty: 1, rate: contract.value, hsnSac, gstRatePercent }],
                supplierState,
                buyerState,
              })
            : null;

          const totalAmount = gstResult ? gstResult.totalAmount : contract.value;
          const invoiceNumber = await getNextNumber(
            "INV",
            contract.organizationId,
            "invoice",
          );

          invoiceBatch.push({
            invoiceNumber,
            billingDate: new Date(billingDate),
            periodEnd,
            totalAmount,
            gstResult,
          });

          lastBilledDate = billingDate;
          billingDate = nextCycleDate;
          generatedForContract = true;
        }

        if (!generatedForContract || !lastBilledDate) continue;

        // Run all DB writes for this contract in a single transaction
        const createdIds = await db.$transaction(async (tx) => {
          const ids: string[] = [];
          for (const item of invoiceBatch) {
            const result = item.gstResult;
            const invoice = await tx.invoice.create({
              data: {
                organizationId: contract.organizationId,
                invoiceNumber: item.invoiceNumber,
                customerId: contract.customerId,
                contractId: contract.id,
                amount: item.totalAmount,
                paidAmount: 0,
                placeOfSupply: result?.placeOfSupply ?? null,
                isInterState: result?.isInterState ?? null,
                subtotalAmount: result?.subtotalAmount ?? contract.value,
                cgstAmount: result?.cgstAmount ?? (gstApplicable ? null : 0),
                sgstAmount: result?.sgstAmount ?? (gstApplicable ? null : 0),
                igstAmount: result?.igstAmount ?? (gstApplicable ? null : 0),
                totalTaxAmount: result?.totalTaxAmount ?? (gstApplicable ? null : 0),
                dueDate: addDays(item.billingDate, 15),
                issuedDate: item.billingDate,
                status: "ISSUED",
                type: "RECURRING",
                notes: `Auto-generated recurring invoice for ${contract.contractNumber}.`,
                items: {
                  create: [
                    {
                      organizationId: contract.organizationId,
                      description: `${contract.plan.name} (${formatBillingCycleLabel(contract.billingCycle)}) for ${contract.asset.name} · ${formatPeriodDate(item.billingDate)} to ${formatPeriodDate(item.periodEnd)}`,
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
            ids.push(invoice.id);
          }

          await tx.contract.update({
            where: { id: contract.id },
            data: {
              lastBilledDate: lastBilledDate!,
              nextBillingDate: billingDate,
            },
          });

          return ids;
        });

        // Notify after transaction commits successfully
        for (const id of createdIds) {
          invoiceIds.push(id);
          await notifyInvoiceCreated(id);
        }
        contractIds.add(contract.id);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            job: "recurring-invoices",
            contractId: contract.id,
            organizationId: contract.organizationId,
          },
        });
        failed[contract.organizationId] =
          error instanceof Error ? error.message : String(error);
      }
    }

    const stats: RecurringInvoiceStats = {
      count: invoiceIds.length,
      invoiceIds,
      contractIds: [...contractIds],
      failed,
    };

    logger.info(
      {
        event: "cron.finish",
        name: "generate-invoices",
        durationMs: Date.now() - start,
        stats: {
          invoicesGenerated: stats.count,
          contractCount: stats.contractIds.length,
          failedOrgs: Object.keys(stats.failed).length,
        },
      },
      "cron finished",
    );

    return stats;
  });
}
