"use client";

import { useState } from "react";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { setMobileOpen } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers, invoices, tickets..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-sm font-semibold text-white shadow-sm">
              VS
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900">Varun Sah</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform hidden sm:block ${showUserMenu ? "rotate-180" : ""}`} />
          </button>
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                <a
                  href="#"
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Your Profile
                </a>
                <a
                  href="/settings"
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Settings
                </a>
                <div className="my-1 border-t border-slate-100" />
                <a
                  href="#"
                  className="block px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
