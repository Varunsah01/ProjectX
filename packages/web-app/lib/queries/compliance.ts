import { db } from "@/lib/db";

export async function getConsentStats(organizationId: string) {
  const [total, granted, withdrawn] = await Promise.all([
    db.consent.count({ where: { organizationId } }),
    db.consent.count({ where: { organizationId, status: "GRANTED" } }),
    db.consent.count({ where: { organizationId, status: "WITHDRAWN" } }),
  ]);

  return { total, granted, withdrawn };
}

export async function getConsentList(
  organizationId: string,
  params: { page?: number; pageSize?: number } = {}
) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  const [consents, total] = await Promise.all([
    db.consent.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.consent.count({ where: { organizationId } }),
  ]);

  return { consents, total, page, pageSize };
}

export async function getDsrList(organizationId: string) {
  return db.dsrRequest.findMany({
    where: { organizationId },
    include: {
      processedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDsrDetail(organizationId: string, id: string) {
  return db.dsrRequest.findFirst({
    where: { id, organizationId },
    include: {
      processedBy: { select: { id: true, name: true } },
    },
  });
}

export async function getBreachList(organizationId: string) {
  return db.breachLog.findMany({
    where: { organizationId },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { detectedAt: "desc" },
  });
}

export async function getBreachDetail(organizationId: string, id: string) {
  return db.breachLog.findFirst({
    where: { id, organizationId },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function getGrievanceOfficer(organizationId: string) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      grievanceOfficerName: true,
      grievanceOfficerEmail: true,
      grievanceOfficerPhone: true,
    },
  });

  return org;
}
