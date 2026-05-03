import { Prisma, ContractStatus, ContractType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  contractDetailsInclude,
  invoiceDetailsInclude,
  jobDetailsInclude,
  mapContract,
  mapInvoice,
  mapJob,
  mapPlan,
} from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getOrganizationContext,
  normalizeListParams,
  toEnumValue,
} from "@/lib/query-utils";
import type { Contract, ListParams, PaginatedData } from "@/lib/types";

function buildContractWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.ContractWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { contractNumber: buildContains(params.search) },
            { customer: { name: buildContains(params.search) } },
            { asset: { name: buildContains(params.search) } },
          ],
        }
      : {}),
    ...(params.status
      ? { status: toEnumValue<ContractStatus>(params.status) }
      : {}),
    ...(params.type ? { type: toEnumValue<ContractType>(params.type) } : {}),
  };
}

function getContractOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.ContractOrderByWithRelationInput {
  switch (sortBy) {
    case "contractNumber":
      return { contractNumber: sortOrder };
    case "startDate":
      return { startDate: sortOrder };
    case "endDate":
      return { endDate: sortOrder };
    case "value":
      return { value: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listContractsForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Contract>> {
  const normalized = normalizeListParams(params);
  const where = buildContractWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.contract.count({ where }),
    db.contract.findMany({
      where,
      include: contractDetailsInclude,
      orderBy: getContractOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapContract),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listContracts(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listContractsForOrganization(user.organizationId, params);
}

export async function getContractDetailForOrganization(organizationId: string, id: string) {
  const contract = await db.contract.findFirst({
    where: {
      id,
      organizationId,
    },
    include: contractDetailsInclude,
  });

  if (!contract) {
    return null;
  }

  const [jobs, invoices] = await Promise.all([
    db.job.findMany({
      where: {
        organizationId,
        assetId: contract.assetId,
      },
      include: jobDetailsInclude,
      orderBy: {
        scheduledDate: "desc",
      },
      take: 100,
    }),
    db.invoice.findMany({
      where: {
        organizationId,
        contractId: contract.id,
      },
      include: invoiceDetailsInclude,
      orderBy: {
        issuedDate: "desc",
      },
      take: 100,
    }),
  ]);

  return {
    contract: mapContract(contract),
    jobs: jobs.map(mapJob),
    invoices: invoices.map(mapInvoice),
  };
}

export async function getContractDetail(id: string) {
  const user = await getOrganizationContext();
  return getContractDetailForOrganization(user.organizationId, id);
}

export async function getContractFormOptionsForOrganization(organizationId: string) {
  const [plans, customers] = await Promise.all([
    db.plan.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        name: "asc",
      },
      take: 200,
    }),
    db.customer.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        city: true,
      },
    }),
  ]);

  return {
    plans: plans.map(mapPlan),
    customers,
  };
}

export async function getContractFormOptions() {
  const user = await getOrganizationContext();
  return getContractFormOptionsForOrganization(user.organizationId);
}

export async function getContractOverviewForOrganization(organizationId: string) {
  const [total, expiringSoon, expired] = await Promise.all([
    db.contract.count({
      where: {
        organizationId,
      },
    }),
    db.contract.count({
      where: {
        organizationId,
        status: "EXPIRING_SOON",
      },
    }),
    db.contract.count({
      where: {
        organizationId,
        status: "EXPIRED",
      },
    }),
  ]);

  return {
    total,
    expiringSoon,
    expired,
  };
}

export async function getContractOverview() {
  const user = await getOrganizationContext();
  return getContractOverviewForOrganization(user.organizationId);
}
