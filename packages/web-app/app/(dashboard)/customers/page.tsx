import { listCustomers } from "@/lib/queries/customers";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import CustomersPageClient from "./page-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = {
    search: readSearchParam(searchParams, "search"),
    status: readSearchParam(searchParams, "status", "all"),
    category: readSearchParam(searchParams, "category", "all"),
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };
  const customers = await listCustomers({
    search: params.search || undefined,
    status: params.status !== "all" ? params.status : undefined,
    category: params.category !== "all" ? params.category : undefined,
    page: params.page,
    pageSize: params.pageSize,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return <CustomersPageClient customers={customers} params={params} />;
}
