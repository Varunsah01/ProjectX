import { getContractOverview, listContracts } from "@/lib/queries/contracts";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import ContractsPageClient from "./page-client";

export default async function ContractsPage({
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
  const [contracts, overview] = await Promise.all([
    listContracts({
      search: params.search || undefined,
      status: params.status !== "all" ? params.status : undefined,
      type: params.type !== "all" ? params.type : undefined,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    getContractOverview(),
  ]);

  return (
    <ContractsPageClient
      contracts={contracts}
      overview={overview}
      params={params}
    />
  );
}
