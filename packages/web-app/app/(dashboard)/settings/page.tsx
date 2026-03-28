"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import { plans, teamMembers } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business settings" />

      <Tabs
        tabs={[
          {
            id: "business",
            label: "Business Profile",
            content: <BusinessProfileTab />,
          },
          {
            id: "team",
            label: "Team",
            count: teamMembers.length,
            content: <TeamTab />,
          },
          {
            id: "plans",
            label: "Service Plans",
            count: plans.length,
            content: <PlansTab />,
          },
          {
            id: "notifications",
            label: "Notifications",
            content: <NotificationsTab />,
          },
        ]}
      />
    </div>
  );
}

function BusinessProfileTab() {
  const [form, setForm] = useState({
    businessName: "Project X Service Co.",
    phone: "+91 98765 00000",
    email: "admin@projectx.in",
    address: "123 Business Park, Sector 5",
    city: "Jaipur",
    state: "Rajasthan",
    gst: "08AABCP1234A1Z1",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-5">
        Business Information
      </h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Business Name
          </label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Address
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            City
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            GST Number
          </label>
          <input
            type="text"
            value={form.gst}
            onChange={(e) => update("gst", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-6 flex items-center gap-3">
        <button className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2">
          Save Changes
        </button>
        <button className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function TeamTab() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="font-semibold text-slate-900">Team Members</h3>
        <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
          Invite Member
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamMembers.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-700">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={member.status} />
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {formatDateTime(member.lastActive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlansTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Manage your service plans and pricing
        </p>
        <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
          Add Plan
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                <span className="text-xs uppercase text-slate-500">
                  {plan.type}
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  plan.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {plan.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(plan.price)}
                </p>
                <p className="text-xs text-slate-500">
                  {plan.duration} months &middot; {plan.visitsCovered} visits
                </p>
              </div>
              <button className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    paymentReminders: true,
    overdueAlerts: true,
    complaintUpdates: true,
    contractExpiry: true,
    jobCompletion: true,
    smsEnabled: true,
    emailEnabled: true,
    whatsappEnabled: false,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900 mb-5">
          Notification Events
        </h3>
        <div className="space-y-5">
          {[
            {
              key: "paymentReminders" as const,
              label: "Payment Reminders",
              desc: "Send reminders before invoice due date",
            },
            {
              key: "overdueAlerts" as const,
              label: "Overdue Alerts",
              desc: "Alert when invoices become overdue",
            },
            {
              key: "complaintUpdates" as const,
              label: "Complaint Updates",
              desc: "Notify on complaint status changes",
            },
            {
              key: "contractExpiry" as const,
              label: "Contract Expiry",
              desc: "Alert 30 days before contract expires",
            },
            {
              key: "jobCompletion" as const,
              label: "Job Completion",
              desc: "Notify when technician completes a job",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 ${
                  settings[item.key] ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings[item.key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900 mb-5">Channels</h3>
        <div className="space-y-5">
          {[
            {
              key: "smsEnabled" as const,
              label: "SMS",
              desc: "Send notifications via SMS",
            },
            {
              key: "emailEnabled" as const,
              label: "Email",
              desc: "Send notifications via email",
            },
            {
              key: "whatsappEnabled" as const,
              label: "WhatsApp",
              desc: "Send notifications via WhatsApp (coming soon)",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 ${
                  settings[item.key] ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings[item.key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
