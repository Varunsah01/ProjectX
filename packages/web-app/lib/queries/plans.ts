import { Prisma, ContractType } from "@prisma/client";
import { db } from "@/lib/db";
import { mapPlan } from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getOrganizationContext,
  normalizeListParams,
  toEnumValue,
} from "@/lib/query-utils";
import type { ListParams, PaginatedData, Plan } from "@/lib/types";

function buildPlanWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.PlanWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { name: buildContains(params.search) },
            { description: buildContains(params.search) },
          ],
        }
      : {}),
    ...(params.type ? { type: toEnumValue<ContractType>(params.type) } : {}),
    ...(params.status && params.status !== "all"
      ? { isActive: params.status === "active" }
      : {}),
  };
}

function getPlanOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.PlanOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { name: sortOrder };
    case "price":
      return { price: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listPlansForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Plan>> {
  const normalized = normalizeListParams(params);
  const where = buildPlanWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.plan.count({ where }),
    db.plan.findMany({
      where,
      orderBy: getPlanOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapPlan),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listPlans(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listPlansForOrganization(user.organizationId, params);
}

export async function getActivePlanOptionsForOrganization(
  organizationId: string,
  type?: string,
) {
  const plans = await db.plan.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(type ? { type: toEnumValue<ContractType>(type) } : {}),
    },
    orderBy: {
      name: "asc",
    },
    take: 200,
  });

  return plans.map(mapPlan);
}

export async function getActivePlanOptions(type?: string) {
  const user = await getOrganizationContext();
  return getActivePlanOptionsForOrganization(user.organizationId, type);
}
