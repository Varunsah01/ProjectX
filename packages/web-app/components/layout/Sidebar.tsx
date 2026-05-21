"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  Wallet,
  AlertCircle,
  Wrench,
  Briefcase,
  Shield,
  ShieldCheck,
  BarChart3,
  ArrowLeftRight,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Search,
  DatabaseBackup,
  FileText,
  Webhook,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSidebar } from "./SidebarContext";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: true;
  supportOnly?: true;
  managerOnly?: true;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Assets", href: "/assets", icon: Package },
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "Technicians", href: "/technicians", icon: Wrench },
      { label: "Complaints", href: "/complaints", icon: AlertCircle },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Collections", href: "/collections", icon: Wallet },
      { label: "Reconciliation", href: "/reconciliation", icon: ArrowLeftRight, adminOnly: true },
      { label: "Contracts", href: "/contracts", icon: Shield },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Compliance", href: "/compliance", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Admin", href: "/admin", icon: ShieldAlert, adminOnly: true },
      { label: "Import", href: "/import", icon: Upload },
      { label: "Audit Log", href: "/audit-log", icon: FileText, adminOnly: true },
      { label: "Account Lookup", href: "/admin/lookup", icon: Search, supportOnly: true },
      { label: "Backup Status", href: "/admin/ops/backups", icon: DatabaseBackup, adminOnly: true },
      { label: "Webhooks", href: "/webhooks", icon: Webhook, adminOnly: true },
      { label: "Recycle Bin", href: "/recycle-bin", icon: Trash2, managerOnly: true },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mobileOpen, toggle, setMobileOpen } = useSidebar();
  const { data: session } = useSession();
  const activeRole = session?.user?.activeRole;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 shadow-md shadow-brand-500/20">
          <span className="text-lg font-bold text-white">R</span>
        </div>
        {!collapsed && (
          <span className="ml-3 text-lg font-bold text-slate-900">
            Recuring
          </span>
        )}
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className={collapsed ? "space-y-4" : "space-y-6"}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.adminOnly && activeRole !== "ADMIN") return false;
              if (item.supportOnly && (activeRole as string) !== "SUPPORT") return false;
              if (item.managerOnly && activeRole !== "ADMIN" && activeRole !== "MANAGER") return false;
              return true;
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                {!collapsed && (
                  <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </h3>
                )}
                <ul className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          aria-label={collapsed ? item.label : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                            isActive
                              ? "bg-brand-50 text-brand-700 shadow-sm shadow-brand-100"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-colors",
                              isActive
                                ? "text-brand-600"
                                : "text-slate-400 group-hover:text-slate-600"
                            )}
                          />
                          {!collapsed && item.label}
                          {isActive && !collapsed && (
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle - desktop only */}
      <div className="hidden border-t border-slate-200 p-3 lg:block">
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
