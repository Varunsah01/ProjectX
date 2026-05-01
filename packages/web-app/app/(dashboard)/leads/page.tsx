import { LeadStatus } from "@prisma/client";
import { listLeads } from "@/lib/queries/leads";
import { readSearchParam } from "@/lib/url-search-params";
import LeadsPageClient from "./page-client";

const VALID_STATUSES = new Set<LeadStatus>([
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.CLOSED,
]);

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const statusParam = readSearchParam(searchParams, "status", "all");
  const search = readSearchParam(searchParams, "search", "");

  const status =
    statusParam !== "all" && VALID_STATUSES.has(statusParam as LeadStatus)
      ? (statusParam as LeadStatus)
      : undefined;

  const leads = await listLeads({
    status,
    search: search || undefined,
  });

  return (
    <LeadsPageClient
      leads={leads.map((lead) => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      }))}
      params={{ status: statusParam, search }}
    />
  );
}
