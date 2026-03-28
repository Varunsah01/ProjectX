import {
  getTicketFormOptions,
  getTicketStatusCounts,
  listTickets,
} from "@/lib/queries/tickets";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import ComplaintsPageClient from "./page-client";

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = {
    search: readSearchParam(searchParams, "search"),
    status: readSearchParam(searchParams, "status", "all"),
    priority: readSearchParam(searchParams, "priority", "all"),
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };
  const [tickets, statusCounts, formOptions] = await Promise.all([
    listTickets({
      search: params.search || undefined,
      status: params.status !== "all" ? params.status : undefined,
      type: params.priority !== "all" ? params.priority : undefined,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    getTicketStatusCounts(),
    getTicketFormOptions(),
  ]);

  return (
    <ComplaintsPageClient
      tickets={tickets}
      technicians={formOptions.technicians}
      statusCounts={statusCounts}
      params={params}
    />
  );
}
