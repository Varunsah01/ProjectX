import { db } from "@/lib/db";
import { mapPortalJob, portalJobInclude } from "@/lib/portal-mappers";
import { normalizeListParams } from "@/lib/query-utils";
import type { PortalJob, PortalListParams, PaginatedData } from "@/lib/portal-types";

export async function listJobsForCustomer(
  customerId: string,
  organizationId: string,
  params: PortalListParams = {},
): Promise<PaginatedData<PortalJob>> {
  const { status, skip, take, page, pageSize } = normalizeListParams(params);

  const where = {
    customerId,
    organizationId,
    ...(status && status !== "all"
      ? { status: status.toUpperCase() as any }
      : {}),
  };

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      include: portalJobInclude,
      orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    db.job.count({ where }),
  ]);

  return {
    data: jobs.map(mapPortalJob),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
