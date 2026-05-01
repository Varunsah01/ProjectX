"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LeadStatus } from "@prisma/client";
import { FilterBar } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { markLeadContactedAction } from "@/lib/actions/leads";
import { formatDate } from "@/lib/utils";

type LeadView = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string | null;
  source: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CLOSED", label: "Closed" },
];

export default function LeadsPageClient({
  leads,
  params,
}: {
  leads: LeadView[];
  params: { status: string; search: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(params.search);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchValue(params.search);
  }, [params.search]);

  function pushParams(next: Record<string, string>) {
    const usp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") {
        usp.delete(key);
      } else {
        usp.set(key, value);
      }
    }
    const query = usp.toString();
    router.push(query ? `/leads?${query}` : "/leads");
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    pushParams({ search: value });
  }

  function handleStatusChange(value: string) {
    pushParams({ status: value });
  }

  async function handleMarkContacted(leadId: string) {
    startTransition(async () => {
      const result = await markLeadContactedAction(leadId);
      if (!result.success) {
        toast.error(result.error ?? "Unable to update lead.");
        return;
      }
      toast.success("Lead marked as contacted.");
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-8">
      <PageHeader
        title="Leads"
        subtitle="Demo requests collected from the marketing site."
      />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by name, email, or company"
        filters={[
          {
            label: "Status",
            value: params.status,
            options: STATUS_OPTIONS,
            onChange: handleStatusChange,
          },
        ]}
        resultCount={leads.length}
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No leads match the current filters.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{lead.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <a className="hover:underline" href={`mailto:${lead.email}`}>
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{lead.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{lead.company}</td>
                  <td className="px-4 py-3 text-slate-500">{lead.source}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status.toLowerCase()} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {lead.status === LeadStatus.NEW ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleMarkContacted(lead.id)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Mark contacted
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
