"use server";

import { revalidatePath } from "next/cache";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { grantConsent, withdrawConsent, recordConsentsForCustomer } from "@/lib/compliance/consent";
import { createDsrRequest, checkErasureEligibility, executeSoftErasure, exportPrincipalData } from "@/lib/compliance/dsr";
import { createBreach, updateBreach, sendBreachNotification } from "@/lib/compliance/breach";
import { getConsentStats, getConsentList, getDsrList, getBreachList } from "@/lib/queries/compliance";
import { createBreachSchema, updateBreachSchema } from "@/lib/validations/breach";
import { recordConsentSchema } from "@/lib/validations/consent";
import type { ConsentPurpose, DataPrincipalType } from "@prisma/client";

export async function getComplianceDashboardAction() {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const [consentStats, dsrRequests, breaches] = await Promise.all([
      getConsentStats(user.organizationId),
      getDsrList(user.organizationId),
      getBreachList(user.organizationId),
    ]);

    return actionSuccess({ consentStats, dsrRequests, breaches });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load compliance dashboard"));
  }
}

export async function getConsentListAction(params: { page?: number; pageSize?: number } = {}) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const data = await getConsentList(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load consents"));
  }
}

export async function grantConsentAction(purpose: ConsentPurpose) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.TECHNICIAN]);
    await grantConsent(
      user.organizationId,
      user.id,
      "USER",
      purpose,
      "Self-service consent via web application"
    );

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "CONSENT_GRANT",
        entity: "Consent",
        entityId: user.id,
        after: { purpose, dataPrincipalType: "USER" },
      }),
    });

    return actionSuccess({ purpose, status: "GRANTED" });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to grant consent"));
  }
}

export async function withdrawConsentAction(purpose: ConsentPurpose) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.TECHNICIAN]);
    await withdrawConsent(user.organizationId, user.id, "USER", purpose);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "CONSENT_WITHDRAW",
        entity: "Consent",
        entityId: user.id,
        after: { purpose, dataPrincipalType: "USER" },
      }),
    });

    return actionSuccess({ purpose, status: "WITHDRAWN" });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to withdraw consent"));
  }
}

export async function recordCustomerConsentAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = recordConsentSchema.parse(input);

    const customer = await db.customer.findFirst({
      where: { id: values.customerId, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!customer) {
      return actionFailure("Customer not found");
    }

    await recordConsentsForCustomer(
      user.organizationId,
      values.customerId,
      values.purposes,
      values.legalBasis,
      values.evidence ?? {},
      user.id
    );

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "CONSENT_GRANT",
        entity: "Consent",
        entityId: values.customerId,
        after: { customerId: values.customerId, purposes: values.purposes, legalBasis: values.legalBasis },
      }),
    });

    revalidatePath(`/customers/${values.customerId}`);
    return actionSuccess({ customerId: values.customerId });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to record consent"));
  }
}

export async function createDsrAccessAction(
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType
) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    const dsr = await createDsrRequest(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType,
      "ACCESS"
    );

    const url = await exportPrincipalData(user.organizationId, dataPrincipalId, dataPrincipalType);

    await db.dsrRequest.update({
      where: { id: dsr.id },
      data: { status: "COMPLETED", processedById: user.id, processedAt: new Date() },
    });

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "DSR_REQUEST",
        entity: "DsrRequest",
        entityId: dsr.id,
        after: { type: "ACCESS", dataPrincipalId, dataPrincipalType },
      }),
    });

    revalidatePath("/compliance");
    return actionSuccess({ url, expiresIn: "7 days", dsrId: dsr.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create data export"));
  }
}

export async function createDsrErasureAction(
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType,
  reason: string
) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    const eligibility = await checkErasureEligibility(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType
    );

    const dsr = await createDsrRequest(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType,
      "ERASURE",
      { reason, eligibility }
    );

    if (!eligibility.eligible) {
      await db.dsrRequest.update({
        where: { id: dsr.id },
        data: {
          status: "REJECTED",
          processedById: user.id,
          processedAt: new Date(),
          responseNotes:
            `Erasure refused: ${eligibility.blockedRecords.length} financial record(s) within 8-year retention period.`,
        },
      });

      revalidatePath("/compliance");
      return actionSuccess({
        dsrId: dsr.id,
        status: "REJECTED" as const,
        blockedRecords: eligibility.blockedRecords,
      });
    }

    await executeSoftErasure(user.organizationId, dataPrincipalId, dataPrincipalType);

    await db.dsrRequest.update({
      where: { id: dsr.id },
      data: {
        status: "COMPLETED",
        processedById: user.id,
        processedAt: new Date(),
        responseNotes: "Erasure completed. Data soft-deleted.",
      },
    });

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "DSR_REQUEST",
        entity: "DsrRequest",
        entityId: dsr.id,
        after: { type: "ERASURE", completed: true, dataPrincipalId, dataPrincipalType },
      }),
    });

    revalidatePath("/compliance");
    return actionSuccess({ dsrId: dsr.id, status: "COMPLETED" as const });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to process erasure request"));
  }
}

export async function createBreachAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const values = createBreachSchema.parse(input);

    const breach = await createBreach(user.organizationId, values, user.id);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "BREACH_LOG",
        entity: "BreachLog",
        entityId: breach.id,
        after: { scope: breach.scope, affectedPrincipals: breach.affectedPrincipals },
      }),
    });

    revalidatePath("/compliance");
    return actionSuccess({ breachId: breach.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create breach log"));
  }
}

export async function updateBreachAction(id: string, input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const values = updateBreachSchema.parse(input);

    const existing = await db.breachLog.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Breach log not found");
    }

    const updated = await updateBreach(id, values);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "BREACH_LOG",
        entity: "BreachLog",
        entityId: id,
        before: { status: existing.status },
        after: { status: updated.status },
      }),
    });

    revalidatePath("/compliance");
    return actionSuccess({ breach: updated });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update breach log"));
  }
}

export async function sendBreachNotificationAction(breachId: string) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    const existing = await db.breachLog.findFirst({
      where: { id: breachId, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Breach log not found");
    }

    const result = await sendBreachNotification(breachId);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "BREACH_LOG",
        entity: "BreachLog",
        entityId: breachId,
        after: { action: "notify_principals", sentCount: result.sentCount },
      }),
    });

    revalidatePath("/compliance");
    return actionSuccess({ sentCount: result.sentCount });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to send breach notifications"));
  }
}
