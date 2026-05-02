"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Shield,
  Wrench,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Home", mobileLabel: "Home" },
  { href: "/invoices", icon: FileText, label: "Invoices", mobileLabel: "Invoices" },
  { href: "/contracts", icon: Shield, label: "Contracts", mobileLabel: "Contracts" },
  { href: "/jobs", icon: Wrench, label: "Jobs", mobileLabel: "Jobs" },
  { href: "/tickets", icon: MessageSquare, label: "Tickets", mobileLabel: "Tickets" },
];

export function PortalNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-14 bottom-0 w-[200px] flex-col border-r border-slate-200 bg-white py-4 px-3 z-20">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors mb-1",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-around py-1.5 px-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[56px] transition-colors",
                  active
                    ? "text-brand-600"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium leading-tight">
                  {item.mobileLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
