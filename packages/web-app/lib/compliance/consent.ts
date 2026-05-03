import type { ConsentPurpose, ConsentStatus, DataPrincipalType } from "@prisma/client";
import { db } from "@/lib/db";

export async function grantConsent(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType,
  purpose: ConsentPurpose,
  legalBasis: string,
  evidence: Record<string, unknown> = {}
) {
  const now = new Date();
  return db.consent.upsert({
    where: {
      organizationId_dataPrincipalId_dataPrincipalType_purpose: {
        organizationId,
        dataPrincipalId,
        dataPrincipalType,
        purpose,
      },
    },
    create: {
      organizationId,
      dataPrincipalId,
      dataPrincipalType,
      purpose,
      status: "GRANTED",
      grantedAt: now,
      legalBasis,
      evidence,
    },
    update: {
      status: "GRANTED",
      grantedAt: now,
      withdrawnAt: null,
      legalBasis,
      evidence,
    },
  });
}

export async function withdrawConsent(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType,
  purpose: ConsentPurpose
) {
  const now = new Date();
  return db.consent.upsert({
    where: {
      organizationId_dataPrincipalId_dataPrincipalType_purpose: {
        organizationId,
        dataPrincipalId,
        dataPrincipalType,
        purpose,
      },
    },
    create: {
      organizationId,
      dataPrincipalId,
      dataPrincipalType,
      purpose,
      status: "WITHDRAWN",
      withdrawnAt: now,
      legalBasis: "Data principal withdrew consent",
    },
    update: {
      status: "WITHDRAWN",
      withdrawnAt: now,
    },
  });
}

export async function getConsentsForPrincipal(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType
) {
  return db.consent.findMany({
    where: { organizationId, dataPrincipalId, dataPrincipalType },
    orderBy: { purpose: "asc" },
  });
}

export async function recordConsentsForCustomer(
  organizationId: string,
  customerId: string,
  purposes: { purpose: ConsentPurpose; granted: boolean }[],
  legalBasis: string,
  evidence: Record<string, unknown>,
  actorId: string
) {
  const now = new Date();
  const enrichedEvidence = { ...evidence, recordedByUserId: actorId, recordedAt: now.toISOString() };

  const operations = purposes.map(({ purpose, granted }) => {
    const status: ConsentStatus = granted ? "GRANTED" : "WITHDRAWN";
    return db.consent.upsert({
      where: {
        organizationId_dataPrincipalId_dataPrincipalType_purpose: {
          organizationId,
          dataPrincipalId: customerId,
          dataPrincipalType: "CUSTOMER",
          purpose,
        },
      },
      create: {
        organizationId,
        dataPrincipalId: customerId,
        dataPrincipalType: "CUSTOMER",
        purpose,
        status,
        grantedAt: granted ? now : null,
        withdrawnAt: granted ? null : now,
        legalBasis,
        evidence: enrichedEvidence,
      },
      update: {
        status,
        grantedAt: granted ? now : undefined,
        withdrawnAt: granted ? null : now,
        legalBasis,
        evidence: enrichedEvidence,
      },
    });
  });

  return db.$transaction(operations);
}
