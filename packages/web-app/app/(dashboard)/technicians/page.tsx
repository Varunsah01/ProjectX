import {
  getTechnicianOverview,
  listTechnicians,
} from "@/lib/queries/technicians";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import TechniciansPageClient from "./page-client";

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = {
    search: readSearchParam(searchParams, "search"),
    status: readSearchParam(searchParams, "status", "all"),
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };
  const [technicians, overview] = await Promise.all([
    listTechnicians({
      search: params.search || undefined,
      status: params.status !== "all" ? params.status : undefined,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: "name",
      sortOrder: "asc",
    }),
    getTechnicianOverview(),
  ]);

  return (
    <TechniciansPageClient
      technicians={technicians}
      overview={overview}
      params={params}
    />
  );
}
