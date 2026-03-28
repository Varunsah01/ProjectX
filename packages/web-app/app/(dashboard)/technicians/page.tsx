"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Phone, Mail, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getInitials } from "@/lib/utils";
import { technicians } from "@/lib/mock-data";

export default function TechniciansPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = technicians.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.territory.toLowerCase().includes(search.toLowerCase()) ||
      t.specialization.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Technicians"
        subtitle={`${technicians.length} technicians \u00b7 ${technicians.filter((t) => t.status === "available").length} available`}
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, territory, or specialization..."
        filters={[
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Status", value: "all" },
              { label: "Available", value: "available" },
              { label: "On Job", value: "on_job" },
              { label: "En Route", value: "en_route" },
              { label: "Off Duty", value: "off_duty" },
            ],
          },
        ]}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-slate-200 bg-white">
          <div className="rounded-full bg-slate-100 p-3 mb-3">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">No technicians found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tech) => (
              <div
                key={tech.id}
                onClick={() => router.push(`/technicians/${tech.id}`)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 font-semibold">
                      {getInitials(tech.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{tech.name}</p>
                      <p className="text-xs text-slate-500">
                        {tech.specialization}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={tech.status} />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{tech.territory}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    {tech.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900 tabular-nums">
                      {tech.activeJobs}
                    </p>
                    <p className="text-xs text-slate-500">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900 tabular-nums">
                      {tech.completedToday}
                    </p>
                    <p className="text-xs text-slate-500">Today</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      <span className="text-lg font-bold text-slate-900 tabular-nums">
                        {tech.rating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Rating</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Showing {filtered.length} of {technicians.length} technicians
          </div>
        </>
      )}
    </div>
  );
}
