import { Prisma, AssetStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  assetDetailsInclude,
  contractDetailsInclude,
  jobDetailsInclude,
  mapAsset,
  mapContract,
  mapJob,
} from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getOrganizationContext,
  normalizeListParams,
  toEnumValue,
} from "@/lib/query-utils";
import type { Asset, ListParams, PaginatedData } from "@/lib/types";

function buildAssetWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.AssetWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { name: buildContains(params.search) },
            { serialNumber: buildContains(params.search) },
            { customer: { name: buildContains(params.search) } },
          ],
        }
      : {}),
    ...(params.status ? { status: toEnumValue<AssetStatus>(params.status) } : {}),
    ...(params.category && params.category !== "all"
      ? { category: params.category }
      : {}),
  };
}

function getAssetOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.AssetOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { name: sortOrder };
    case "category":
      return { category: sortOrder };
    case "installationDate":
      return { installationDate: sortOrder };
    case "nextServiceDate":
      return { nextServiceDate: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listAssetsForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Asset>> {
  const normalized = normalizeListParams(params);
  const where = buildAssetWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.asset.count({ where }),
    db.asset.findMany({
      where,
      include: assetDetailsInclude,
      orderBy: getAssetOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapAsset),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listAssets(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listAssetsForOrganization(user.organizationId, params);
}

export async function getAssetDetailForOrganization(organizationId: string, id: string) {
  const asset = await db.asset.findFirst({
    where: {
      id,
      organizationId,
    },
    include: assetDetailsInclude,
  });

  if (!asset) {
    return null;
  }

  const [contracts, jobs] = await Promise.all([
    db.contract.findMany({
      where: {
        organizationId,
        assetId: id,
      },
      include: contractDetailsInclude,
      orderBy: {
        startDate: "desc",
      },
    }),
    db.job.findMany({
      where: {
        organizationId,
        assetId: id,
      },
      include: jobDetailsInclude,
      orderBy: {
        scheduledDate: "desc",
      },
    }),
  ]);

  return {
    asset: mapAsset(asset),
    contracts: contracts.map(mapContract),
    jobs: jobs.map(mapJob),
  };
}

export async function getAssetDetail(id: string) {
  const user = await getOrganizationContext();
  return getAssetDetailForOrganization(user.organizationId, id);
}

export async function getAssetsForCustomerForOrganization(
  organizationId: string,
  customerId: string,
) {
  const assets = await db.asset.findMany({
    where: {
      organizationId,
      customerId,
    },
    include: assetDetailsInclude,
    orderBy: {
      name: "asc",
    },
  });

  return assets.map(mapAsset);
}

export async function getAssetsForCustomer(customerId: string) {
  const user = await getOrganizationContext();
  return getAssetsForCustomerForOrganization(user.organizationId, customerId);
}

export async function getAssetCategoriesForOrganization(organizationId: string) {
  const categories = await db.asset.findMany({
    where: {
      organizationId,
    },
    select: {
      category: true,
    },
    distinct: ["category"],
    orderBy: {
      category: "asc",
    },
  });

  return categories.map((category) => category.category);
}

export async function getAssetCategories() {
  const user = await getOrganizationContext();
  return getAssetCategoriesForOrganization(user.organizationId);
}
