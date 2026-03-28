"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Star,
  Briefcase,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate, getInitials } from "@/lib/utils";
import {
  technicians,
  jobs,
  tickets,
  type Job,
  type Ticket,
} from "@/lib/mock-data";

export default function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const tech = technicians.find((t) => t.id === id);

  if (!tech) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Technician not found</p>
        <button
          onClick={() => router.push("/technicians")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to technicians
        </button>
      </div>
    );
  }

  const techJobs = jobs.filter((j) => j.technicianName === tech.name);
  const techTickets = tickets.filter((t) => t.assignedTo === tech.name);

  const filledStars = Math.round(tech.rating);

  return (
    <div>
      <PageHeader
        title={tech.name}
        breadcrumbs={[
          { label: "Technicians", href: "/technicians" },
          { label: tech.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xl font-bold text-brand-700">
                {getInitials(tech.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {tech.name}
                  </h2>
                  <StatusBadge status={tech.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {tech.specialization}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {tech.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{tech.territory}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Briefcase className="h-4 w-4" />
                <span className="text-xs font-medium">Active Jobs</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {tech.activeJobs}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Completed Today</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {tech.completedToday}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">Total Rating</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {tech.rating}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-medium">Territory</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {tech.territory}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            tabs={[
              {
                id: "jobs",
                label: "Job History",
                count: techJobs.length,
                content: (
                  <DataTable<Job>
                    columns={[
                      {
                        key: "jobNumber",
                        header: "Job #",
                        render: (j) => (
                          <span className="font-medium text-slate-900">
                            {j.jobNumber}
                          </span>
                        ),
                      },
                      {
                        key: "customer",
                        header: "Customer",
                        render: (j) => j.customerName,
                      },
                      {
                        key: "type",
                        header: "Type",
                        render: (j) => (
                          <span className="capitalize">{j.type}</span>
                        ),
                      },
                      {
                        key: "date",
                        header: "Date",
                        render: (j) => formatDate(j.scheduledDate),
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (j) => <StatusBadge status={j.status} />,
                      },
                    ]}
                    data={techJobs}
                    onRowClick={(j) => router.push(`/jobs/${j.id}`)}
                  />
                ),
              },
              {
                id: "tickets",
                label: "Assigned Tickets",
                count: techTickets.length,
                content: (
                  <DataTable<Ticket>
                    columns={[
                      {
                        key: "ticketNumber",
                        header: "Ticket #",
                        render: (t) => (
                          <span className="font-medium text-slate-900">
                            {t.ticketNumber}
                          </span>
                        ),
                      },
                      {
                        key: "subject",
                        header: "Subject",
                        render: (t) => t.subject,
                      },
                      {
                        key: "customer",
                        header: "Customer",
                        render: (t) => t.customerName,
                      },
                      {
                        key: "priority",
                        header: "Priority",
                        render: (t) => <StatusBadge status={t.priority} />,
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (t) => <StatusBadge status={t.status} />,
                      },
                    ]}
                    data={techTickets}
                    onRowClick={(t) => router.push(`/complaints/${t.id}`)}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Performance Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Performance</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Rating</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < filledStars
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-900 tabular-nums">
                    {tech.rating}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Active Jobs</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {tech.activeJobs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Completed Today</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {tech.completedToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Completed This Week
                </span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {tech.completedThisWeek}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Completed This Month
                </span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {tech.completedThisMonth}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Total Jobs
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    {tech.totalJobs}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Skills / Specialization Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">
              Skills & Specialization
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                {tech.specialization}
              </span>
              {tech.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Availability Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Availability</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Current Status</span>
                <StatusBadge status={tech.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Territory</span>
                <span className="text-sm font-medium text-slate-900">
                  {tech.territory}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Joined</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatDate(tech.joinDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
