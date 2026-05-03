"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSidebar } from "./SidebarContext";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Assets", href: "/assets", icon: Package },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Collections", href: "/collections", icon: Wallet },
  { label: "Complaints", href: "/complaints", icon: AlertCircle },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Technicians", href: "/technicians", icon: Wrench },
  { label: "Contracts", href: "/contracts", icon: Shield },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mobileOpen, toggle, setMobileOpen } = useSidebar();
  const { data: session } = useSession();
  const activeRole = session?.user?.activeRole;
  const showRecycleBin = activeRole === "ADMIN" || activeRole === "MANAGER";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 shadow-md shadow-brand-500/20">
          <span className="text-lg font-bold text-white">X</span>
        </div>
        {!collapsed && (
          <span className="ml-3 text-lg font-bold text-slate-900">
            Project X
          </span>
        )}
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            if ("adminOnly" in item && item.adminOnly && activeRole !== "ADMIN") {
              return null;
            }
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
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
          {showRecycleBin && (() => {
            const isActive = pathname.startsWith("/recycle-bin");
            return (
              <li key="/recycle-bin">
                <Link
                  href="/recycle-bin"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-brand-50 text-brand-700 shadow-sm shadow-brand-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  title={collapsed ? "Recycle Bin" : undefined}
                >
                  <Trash2
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-brand-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {!collapsed && "Recycle Bin"}
                  {isActive && !collapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600" />
                  )}
                </Link>
              </li>
            );
          })()}
        </ul>
      </nav>

      {/* Collapse Toggle - desktop only */}
      <div className="hidden border-t border-slate-200 p-3 lg:block">
        <button
          onClick={toggle}
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
