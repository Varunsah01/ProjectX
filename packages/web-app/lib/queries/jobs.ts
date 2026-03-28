import { Prisma, JobStatus, JobType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  jobDetailsInclude,
  mapJob,
  mapTechnician,
  technicianSelect,
} from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getOrganizationContext,
  normalizeListParams,
  toEnumValue,
} from "@/lib/query-utils";
import type { Job, ListParams, PaginatedData } from "@/lib/types";

function buildJobWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.JobWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { jobNumber: buildContains(params.search) },
            { customer: { name: buildContains(params.search) } },
            { technician: { name: buildContains(params.search) } },
          ],
        }
      : {}),
    ...(params.status ? { status: toEnumValue<JobStatus>(params.status) } : {}),
    ...(params.type ? { type: toEnumValue<JobType>(params.type) } : {}),
  };
}

function getJobOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.JobOrderByWithRelationInput {
  switch (sortBy) {
    case "jobNumber":
      return { jobNumber: sortOrder };
    case "scheduledDate":
      return { scheduledDate: sortOrder };
    case "status":
      return { status: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listJobsForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Job>> {
  const normalized = normalizeListParams(params);
  const where = buildJobWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      include: jobDetailsInclude,
      orderBy: getJobOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapJob),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listJobs(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listJobsForOrganization(user.organizationId, params);
}

export async function getJobDetailForOrganization(organizationId: string, id: string) {
  const job = await db.job.findFirst({
    where: {
      id,
      organizationId,
    },
    include: jobDetailsInclude,
  });

  if (!job) {
    return null;
  }

  return mapJob(job);
}

export async function getJobDetail(id: string) {
  const user = await getOrganizationContext();
  return getJobDetailForOrganization(user.organizationId, id);
}

export async function getJobFormOptionsForOrganization(organizationId: string) {
  const [customers, technicians] = await Promise.all([
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
    db.user.findMany({
      where: {
        organizationId,
        role: "TECHNICIAN",
        status: {
          in: ["available", "on_job", "en_route"],
        },
      },
      select: technicianSelect,
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    customers,
    technicians: technicians.map(mapTechnician),
  };
}

export async function getJobFormOptions() {
  const user = await getOrganizationContext();
  return getJobFormOptionsForOrganization(user.organizationId);
}
