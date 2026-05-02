import { db } from "@/lib/db";
import { mapPortalContract, portalContractInclude } from "@/lib/portal-mappers";
import { normalizeListParams } from "@/lib/query-utils";
import type { PortalContract, PortalListParams, PaginatedData } from "@/lib/portal-types";

export async function listContractsForCustomer(
  customerId: string,
  organizationId: string,
  params: PortalListParams = {},
): Promise<PaginatedData<PortalContract>> {
  const { status, skip, take, page, pageSize } = normalizeListParams(params);

  const where = {
    customerId,
    organizationId,
    ...(status && status !== "all"
      ? { status: status.toUpperCase() as any }
      : {}),
  };

  const [contracts, total] = await Promise.all([
    db.contract.findMany({
      where,
      include: portalContractInclude,
      orderBy: { endDate: "desc" },
      skip,
      take,
    }),
    db.contract.count({ where }),
  ]);

  return {
    data: contracts.map(mapPortalContract),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getContractDetailForCustomer(
  customerId: string,
  organizationId: string,
  contractId: string,
): Promise<PortalContract | null> {
  const contract = await db.contract.findFirst({
    where: { id: contractId, customerId, organizationId },
    include: portalContractInclude,
  });

  if (!contract) return null;
  return mapPortalContract(contract);
}
