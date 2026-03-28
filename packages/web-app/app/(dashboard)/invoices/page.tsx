import { getInvoiceOverview, listInvoices } from "@/lib/queries/invoices";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import InvoicesPageClient from "./page-client";

export default async function InvoicesPage({
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
  const [invoices, overview] = await Promise.all([
    listInvoices({
      search: params.search || undefined,
      status: params.status !== "all" ? params.status : undefined,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    getInvoiceOverview(),
  ]);

  return (
    <InvoicesPageClient
      invoices={invoices}
      overview={overview}
      params={params}
    />
  );
}
