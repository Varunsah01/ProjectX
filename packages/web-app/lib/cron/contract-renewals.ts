import * as React from "react";
import * as Sentry from "@sentry/nextjs";
import { ContractReminderStage, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ContractRenewalReminderEmail } from "@/lib/email-templates/contract-renewal-reminder";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { getISTDate } from "@/lib/cron/lock";
import { notifyCustomer } from "@/lib/messaging/service";

export interface ContractRenewalResult {
  count: number;
  contractIds: string[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stageForDays(days: number): ContractReminderStage | null {
  if (days === 1) return ContractReminderStage.T_1;
  if (days === 7) return ContractReminderStage.T_7;
  if (days === 30) return ContractReminderStage.T_30;
  return null;
}

const internalRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT];

export async function sendContractRenewalReminders(
  referenceDate = new Date(),
): Promise<ContractRenewalResult> {
  const today = getISTDate(referenceDate);
  const in1 = addDays(today, 1);
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);

  const contracts = await db.contract.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
      endDate: { in: [in1, in7, in30] },
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, preferredChannel: true, whatsappOptOut: true } },
      organization: { select: { id: true, name: true } },
      asset: { select: { name: true } },
      reminders: true,
    },
    orderBy: [{ organizationId: "asc" }, { endDate: "asc" }],
  });

  // Pre-fetch internal users per org to avoid N+1
  const orgIds = [...new Set(contracts.map((c) => c.organizationId))];
  const allOrgUsers = orgIds.length > 0
    ? await db.user.findMany({
        where: { organizationId: { in: orgIds }, role: { in: [...internalRoles] } },
        select: { id: true, organizationId: true },
      })
    : [];
  const internalUsersByOrg = new Map<string, Array<{ id: string }>>();
  for (const u of allOrgUsers) {
    const arr = internalUsersByOrg.get(u.organizationId!) ?? [];
    arr.push({ id: u.id });
    internalUsersByOrg.set(u.organizationId!, arr);
  }

  const sentContractIds: string[] = [];

  for (const contract of contracts) {
    try {
      if (!contract.customer.email) {
        continue;
      }

      const daysRemaining = Math.round(
        (contract.endDate.getTime() - today.getTime()) / 86_400_000,
      );
      const stage = stageForDays(daysRemaining);
      if (!stage) {
        continue;
      }

      if (contract.reminders.some((r) => r.stage === stage)) {
        continue;
      }

      // Atomic check-and-create inside a transaction to prevent double-send
      // under concurrent cron runs. HTTP calls (email/notifications) happen
      // OUTSIDE the transaction after it commits.
      const didCreate = await db.$transaction(async (tx) => {
        const existing = await tx.contractReminder.findFirst({
          where: { contractId: contract.id, stage },
        });
        if (existing) return false;
        await tx.contractReminder.create({ data: { contractId: contract.id, stage } });
        return true;
      });

      if (!didCreate) continue; // concurrent run already handled this contract

      const contractUrl = `${getAppUrl()}/contracts/${contract.id}`;
      const html = renderEmailTemplate(
        React.createElement(ContractRenewalReminderEmail, {
          customerName: contract.customer.name,
          organizationName: contract.organization.name,
          contractNumber: contract.contractNumber,
          assetName: contract.asset.name,
          expiryDate: formatDate(contract.endDate),
          contractUrl,
          daysRemaining,
        }),
      );

      await sendEmail(
        contract.customer.email,
        `Contract ${contract.contractNumber} expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
        await html,
      );

      const internalUsers = internalUsersByOrg.get(contract.organizationId) ?? [];

      if (internalUsers.length > 0) {
        await db.notification.createMany({
          data: internalUsers.map((u) => ({
            organizationId: contract.organizationId,
            userId: u.id,
            type: "contract_renewal_reminder",
            title: `Contract ${contract.contractNumber} expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
            message: `${contract.customer.name}'s contract (${contract.contractNumber}) expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
            link: `/contracts/${contract.id}`,
          })),
        });
      }

      await notifyCustomer(
        {
          id: contract.customer.id,
          organizationId: contract.organizationId,
          phone: contract.customer.phone,
          preferredChannel: contract.customer.preferredChannel,
          whatsappOptOut: contract.customer.whatsappOptOut,
        },
        "contract_renewal_due",
        {
          contractNumber: contract.contractNumber,
          daysRemaining: String(daysRemaining),
          expiryDate: formatDate(contract.endDate),
          contractUrl,
        },
      ).catch(() => {});

      sentContractIds.push(contract.id);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          job: "contract-renewals",
          contractId: contract.id,
          organizationId: contract.organizationId,
        },
      });
      // record and continue — don't abort the loop on one failure
    }
  }

  return { count: sentContractIds.length, contractIds: sentContractIds };
}
