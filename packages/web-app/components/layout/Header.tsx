"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search, Bell, ChevronDown, Menu,
  Users, Receipt, AlertCircle, Wrench, FileText, CircleHelp,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { globalSearchAction, type SearchResult } from "@/lib/actions/search";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  type AppNotification,
} from "@/lib/actions/notifications";

// ── Focus helper ─────────────────────────────────────────────────────────────

function focusFirstMenuItem(ref: React.RefObject<HTMLDivElement>) {
  requestAnimationFrame(() => {
    const first = ref.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    );
    // Fallback: focus the panel itself so onBlur tracking still works (e.g. empty notif list)
    (first ?? ref.current)?.focus();
  });
}

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { setMobileOpen } = useSidebar();
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const user = session?.user;
  const displayName = user?.name || "Workspace User";
  const role = formatRole(user?.activeRole);
  const initials = getInitials(displayName);
  const memberships = user?.memberships ?? [];
  const activeOrgId = user?.activeOrgId;
  const activeOrgName = memberships.find((m) => m.organizationId === activeOrgId)?.orgName ?? "Organization";
  const [orgSwitching, setOrgSwitching] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // ── Dropdown refs ────────────────────────────────────────────────────────
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const orgTriggerRef = useRef<HTMLButtonElement>(null);
  const orgPanelRef = useRef<HTMLDivElement>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const userMenuPanelRef = useRef<HTMLDivElement>(null);

  // ── Auto-focus first menu item on open ──────────────────────────────────
  useEffect(() => { if (notifOpen)       focusFirstMenuItem(notifPanelRef);   }, [notifOpen]);
  useEffect(() => { if (orgDropdownOpen) focusFirstMenuItem(orgPanelRef);     }, [orgDropdownOpen]);
  useEffect(() => { if (showUserMenu)    focusFirstMenuItem(userMenuPanelRef); }, [showUserMenu]);

  // ── Global Escape handler ────────────────────────────────────────────────
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (notifOpen) {
        setNotifOpen(false);
        bellButtonRef.current?.focus();
      } else if (orgDropdownOpen) {
        setOrgDropdownOpen(false);
        orgTriggerRef.current?.focus();
      } else if (showUserMenu) {
        setShowUserMenu(false);
        userMenuTriggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [notifOpen, orgDropdownOpen, showUserMenu]);

  // Prime unread badge on mount
  useEffect(() => {
    getNotificationsAction().then((res) => {
      if (res.success) {
        setUnreadCount(res.data.filter((n) => !n.read).length);
      }
    });
  }, []);

  // Clear search on navigation
  useEffect(() => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setNotifOpen(false);
  }, [pathname]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setShowDropdown(query.length > 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await globalSearchAction(query);
      setIsSearching(false);
      if (res.success) {
        setResults(res.data);
        setShowDropdown(true);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setQuery("");
    }
  }, []);

  async function handleBellClick() {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    setNotifOpen(true);
    const res = await getNotificationsAction();
    if (res.success) {
      setNotifications(res.data);
      const unread = res.data.filter((n) => !n.read).length;
      setUnreadCount(unread);
      if (unread > 0) {
        await markAllNotificationsReadAction();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleSignOut() {
    setShowUserMenu(false);
    await signOut({ callbackUrl: "/login" });
  }

  async function switchOrg(orgId: string) {
    if (orgId === activeOrgId || orgSwitching) return;
    setOrgSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { activeOrgId: string; activeRole: string };
        await update({ activeOrgId: data.activeOrgId, activeRole: data.activeRole });
        window.location.href = "/";
      }
    } finally {
      setOrgSwitching(false);
      setOrgDropdownOpen(false);
    }
  }

  const grouped = groupResults(results);
  const hasResults = results.length > 0;
  const showNoResults = query.length >= 2 && !isSearching && !hasResults;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Search */}
        <div ref={searchWrapperRef} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.length >= 2) setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, invoices, tickets..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-16 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
          <kbd
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden cursor-pointer items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 sm:inline-flex"
          >
            <KbdShortcut />
          </kbd>

          {/* Search dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {isSearching && (
                <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
              )}
              {showNoResults && (
                <div className="px-4 py-3 text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</div>
              )}
              {hasResults && !isSearching && (
                <div className="max-h-80 overflow-y-auto py-1">
                  {grouped.map(({ label, icon: Icon, items }) => (
                    <div key={label}>
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {label}
                        </span>
                      </div>
                      {items.map((result) => (
                        <Link
                          key={result.id}
                          href={getResultHref(result)}
                          onClick={() => { setShowDropdown(false); setQuery(""); }}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {getResultTitle(result)}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {getResultSubtitle(result)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Notifications */}
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setNotifOpen(false);
            }
          }}
        >
          <button
            ref={bellButtonRef}
            onClick={handleBellClick}
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div
                ref={notifPanelRef}
                role="menu"
                tabIndex={-1}
                aria-label="Notifications"
                className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 focus:outline-none"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={handleMarkAllRead}
                      role="menuitem"
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                      <Bell className="h-8 w-8 text-slate-200" aria-hidden="true" />
                      <p className="text-sm text-slate-500">You&rsquo;re all caught up.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((n) => {
                        const Icon = getNotifIcon(n.type);
                        const href = n.link ?? "#";
                        return (
                          <Link
                            key={n.id}
                            href={href}
                            role="menuitem"
                            onClick={() => setNotifOpen(false)}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                              !n.read ? "bg-brand-50/40" : ""
                            }`}
                          >
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getNotifIconBg(n.type)}`}>
                              <Icon className={`h-3.5 w-3.5 ${getNotifIconColor(n.type)}`} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 leading-snug">
                                {n.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {n.message}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {formatRelativeTime(n.createdAt)}
                              </p>
                            </div>
                            {!n.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help docs */}
        <a
          href={getDocsPath(pathname)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Help and documentation"
          title="Help & Documentation"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <CircleHelp className="h-5 w-5" aria-hidden="true" />
        </a>

        {/* Org Switcher */}
        {memberships.length > 1 && (
          <div
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOrgDropdownOpen(false);
              }
            }}
          >
            <button
              ref={orgTriggerRef}
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              disabled={orgSwitching}
              aria-haspopup="menu"
              aria-expanded={orgDropdownOpen}
              aria-label={`Switch organization, currently ${activeOrgName}`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <span className="hidden sm:inline max-w-[120px] truncate">{activeOrgName}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${orgDropdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {orgDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOrgDropdownOpen(false)}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <div
                  ref={orgPanelRef}
                  role="menu"
                  aria-label="Switch organization"
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 focus:outline-none"
                >
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400" aria-hidden="true">
                    Switch Organization
                  </div>
                  {memberships.map((m) => (
                    <button
                      key={m.organizationId}
                      type="button"
                      role="menuitem"
                      onClick={() => switchOrg(m.organizationId)}
                      disabled={orgSwitching}
                      aria-current={m.organizationId === activeOrgId ? "true" : undefined}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700" aria-hidden="true">
                        {m.orgName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-slate-900">{m.orgName}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{m.role.toLowerCase()}</p>
                      </div>
                      {m.organizationId === activeOrgId && (
                        <svg className="h-4 w-4 shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* User Menu */}
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setShowUserMenu(false);
            }
          }}
        >
          <button
            ref={userMenuTriggerRef}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label={`User menu for ${displayName}`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm" aria-hidden="true">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900">
                {status === "loading" ? "Loading..." : displayName}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  {role}
                </span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform hidden sm:block ${showUserMenu ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div
                ref={userMenuPanelRef}
                role="menu"
                aria-label="User menu"
                className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 focus:outline-none"
              >
                <div className="px-4 py-2.5" aria-hidden="true">
                  <p className="text-sm font-medium text-slate-900">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email ?? "Signed in"}</p>
                </div>
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Search helpers ───────────────────────────────────────────────────────────

type GroupEntry = {
  label: string;
  icon: React.ElementType;
  items: SearchResult[];
};

function groupResults(results: SearchResult[]): GroupEntry[] {
  const map: Record<string, GroupEntry> = {
    customer: { label: "Customers", icon: Users, items: [] },
    invoice:  { label: "Invoices",  icon: Receipt, items: [] },
    ticket:   { label: "Complaints", icon: AlertCircle, items: [] },
    job:      { label: "Jobs",      icon: Wrench, items: [] },
  };
  for (const r of results) map[r.type].items.push(r);
  return Object.values(map).filter((g) => g.items.length > 0);
}

function getResultHref(result: SearchResult): string {
  switch (result.type) {
    case "customer": return `/customers/${result.id}`;
    case "invoice":  return `/invoices/${result.id}`;
    case "ticket":   return `/complaints/${result.id}`;
    case "job":      return `/jobs/${result.id}`;
  }
}

function getResultTitle(result: SearchResult): string {
  switch (result.type) {
    case "customer": return result.name;
    case "invoice":  return result.invoiceNumber;
    case "ticket":   return result.subject;
    case "job":      return result.jobNumber;
  }
}

function getResultSubtitle(result: SearchResult): string {
  switch (result.type) {
    case "customer": return result.city;
    case "invoice":  return `${result.customerName} · ${result.status}`;
    case "ticket":   return result.priority;
    case "job":      return result.jobType;
  }
}

// ── Notification helpers ─────────────────────────────────────────────────────

function getNotifIcon(type: string): React.ElementType {
  if (type.startsWith("invoice"))  return Receipt;
  if (type.startsWith("contract")) return FileText;
  if (type.startsWith("ticket"))   return AlertCircle;
  if (type.startsWith("job"))      return Wrench;
  return Bell;
}

function getNotifIconBg(type: string): string {
  if (type.startsWith("invoice"))  return "bg-blue-50";
  if (type.startsWith("contract")) return "bg-purple-50";
  if (type.startsWith("ticket"))   return "bg-red-50";
  if (type.startsWith("job"))      return "bg-green-50";
  return "bg-slate-100";
}

function getNotifIconColor(type: string): string {
  if (type.startsWith("invoice"))  return "text-blue-500";
  if (type.startsWith("contract")) return "text-purple-500";
  if (type.startsWith("ticket"))   return "text-red-500";
  if (type.startsWith("job"))      return "text-green-600";
  return "text-slate-500";
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Docs path helper ─────────────────────────────────────────────────────────

const DOCS_BASE = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.recuring.in";

function getDocsPath(pathname: string): string {
  if (pathname === "/")                        return `${DOCS_BASE}/getting-started`;
  if (pathname.startsWith("/customers"))       return `${DOCS_BASE}/concepts/customers`;
  if (pathname.startsWith("/assets"))          return `${DOCS_BASE}/concepts/assets`;
  if (pathname.startsWith("/contracts"))       return `${DOCS_BASE}/concepts/contracts`;
  if (pathname.startsWith("/complaints"))      return `${DOCS_BASE}/concepts/complaints`;
  if (pathname.startsWith("/jobs"))            return `${DOCS_BASE}/concepts/jobs`;
  if (pathname.startsWith("/technicians"))     return `${DOCS_BASE}/concepts/jobs`;
  if (pathname.startsWith("/invoices"))        return `${DOCS_BASE}/getting-started/first-invoice`;
  if (pathname.startsWith("/import"))          return `${DOCS_BASE}/how-tos/bulk-import`;
  if (pathname.startsWith("/reconciliation"))  return `${DOCS_BASE}/how-tos/tally-export`;
  if (pathname.startsWith("/compliance"))      return `${DOCS_BASE}/compliance`;
  if (pathname.startsWith("/settings"))        return `${DOCS_BASE}/getting-started/signup`;
  if (pathname.startsWith("/admin/ops"))       return `${DOCS_BASE}/compliance`;
  return DOCS_BASE;
}

// ── Misc ─────────────────────────────────────────────────────────────────────

function formatRole(role?: string) {
  if (!role) return "User";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function KbdShortcut() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);
  return <>{isMac ? "⌘K" : "Ctrl K"}</>;
}
