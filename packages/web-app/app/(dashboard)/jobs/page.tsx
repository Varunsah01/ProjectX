import { getJobFormOptions, listJobs } from "@/lib/queries/jobs";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import JobsPageClient from "./page-client";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = {
    search: readSearchParam(searchParams, "search"),
    status: readSearchParam(searchParams, "status", "all"),
    type: readSearchParam(searchParams, "type", "all"),
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };
  const [jobs, formOptions] = await Promise.all([
    listJobs({
      search: params.search || undefined,
      status: params.status !== "all" ? params.status : undefined,
      type: params.type !== "all" ? params.type : undefined,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    getJobFormOptions(),
  ]);

  return (
    <JobsPageClient
      jobs={jobs}
      technicians={formOptions.technicians}
      params={params}
    />
  );
}
