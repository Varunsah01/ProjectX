import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText, Search, Wrench, Webhook } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/ui/PageHeader";

const ADMIN_PAGES = [
  {
    href: "/admin/audit-log",
    title: "Audit Log",
    description: "System-wide change history with actor, entity, and timestamp.",
    icon: FileText,
  },
  {
    href: "/admin/lookup",
    title: "User Lookup",
    description: "Search users across the organization (support tooling).",
    icon: Search,
  },
  {
    href: "/admin/ops/backups",
    title: "Ops Console",
    description: "Operational tools — backup verification status.",
    icon: Wrench,
  },
  {
    href: "/admin/webhooks",
    title: "Webhooks",
    description: "Outbound webhook configuration and delivery logs.",
    icon: Webhook,
  },
];

export default async function AdminIndexPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Administrative tools and system records."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <page.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{page.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{page.description}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors group-hover:text-brand-700">
              Open
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
