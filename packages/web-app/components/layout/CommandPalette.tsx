"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Command } from "cmdk";
import {
  Users,
  Receipt,
  Briefcase,
  LogOut,
  UserPlus,
  FilePlus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { globalSearchAction, type SearchResult } from "@/lib/actions/search";
import { navGroups } from "./Sidebar";

// ── Recent commands persistence ──────────────────────────────────────────────

const RECENT_KEY = "cmdk:recent";
const MAX_RECENT = 5;

type RecentEntry = {
  label: string;
  href: string;
  timestamp: number;
};

function getRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(entry: Omit<RecentEntry, "timestamp">) {
  const existing = getRecent().filter((r) => r.href !== entry.href);
  const next = [{ ...entry, timestamp: Date.now() }, ...existing].slice(
    0,
    MAX_RECENT,
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ── Search result helpers ────────────────────────────────────────────────────

function getResultHref(result: SearchResult): string {
  switch (result.type) {
    case "customer":
      return `/customers/${result.id}`;
    case "invoice":
      return `/invoices/${result.id}`;
    case "ticket":
      return `/complaints/${result.id}`;
    case "job":
      return `/jobs/${result.id}`;
  }
}

function getResultLabel(result: SearchResult): string {
  switch (result.type) {
    case "customer":
      return result.name;
    case "invoice":
      return result.invoiceNumber;
    case "ticket":
      return result.subject;
    case "job":
      return result.jobNumber;
  }
}

function getResultSublabel(result: SearchResult): string {
  switch (result.type) {
    case "customer":
      return result.city;
    case "invoice":
      return `${result.customerName} · ${result.status}`;
    case "ticket":
      return result.priority;
    case "job":
      return result.jobType;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const activeRole = session?.user?.activeRole;

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load recent on open
  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setInputValue("");
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await globalSearchAction(inputValue, 5);
      if (res.success) {
        setResults(res.data);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const navigate = useCallback(
    (href: string, label: string) => {
      pushRecent({ label, href });
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleSignOut = useCallback(() => {
    setOpen(false);
    localStorage.removeItem(RECENT_KEY);
    signOut({ callbackUrl: "/login" });
  }, []);

  // Visible pages based on role
  const visiblePages = navGroups.flatMap((group) =>
    group.items.filter((item) => {
      if (item.adminOnly && activeRole !== "ADMIN") return false;
      if (item.supportOnly && (activeRole as string) !== "SUPPORT") return false;
      if (item.managerOnly && activeRole !== "ADMIN" && activeRole !== "MANAGER")
        return false;
      return true;
    }),
  );

  // Group search results by type
  const customers = results.filter((r) => r.type === "customer");
  const invoices = results.filter((r) => r.type === "invoice");
  const jobs = results.filter((r) => r.type === "job");

  const showRecent = inputValue.length === 0 && recent.length > 0;
  const showSearchResults = inputValue.length >= 2 && results.length > 0;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed inset-0 z-50"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <Command.Input
          value={inputValue}
          onValueChange={setInputValue}
          placeholder="Search pages, customers, invoices..."
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />

        <Command.List className="max-h-80 overflow-y-auto py-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-slate-500">
            No results found.
          </Command.Empty>

          {/* Recent */}
          {showRecent && (
            <Command.Group
              heading="Recent"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              {recent.map((entry) => (
                <Command.Item
                  key={entry.href}
                  value={entry.label}
                  onSelect={() => navigate(entry.href, entry.label)}
                  className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
                >
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  {entry.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Pages */}
          <Command.Group
            heading="Pages"
            className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
          >
            {visiblePages.map((item) => (
              <Command.Item
                key={item.href}
                value={item.label}
                onSelect={() => navigate(item.href, item.label)}
                className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
              >
                <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>

          {/* Search results: Customers */}
          {showSearchResults && customers.length > 0 && (
            <Command.Group
              heading="Customers"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              {customers.map((r) => (
                <Command.Item
                  key={r.id}
                  value={getResultLabel(r)}
                  onSelect={() => navigate(getResultHref(r), getResultLabel(r))}
                  className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
                >
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{getResultLabel(r)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {getResultSublabel(r)}
                    </p>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Search results: Invoices */}
          {showSearchResults && invoices.length > 0 && (
            <Command.Group
              heading="Invoices"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              {invoices.map((r) => (
                <Command.Item
                  key={r.id}
                  value={getResultLabel(r)}
                  onSelect={() => navigate(getResultHref(r), getResultLabel(r))}
                  className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
                >
                  <Receipt className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{getResultLabel(r)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {getResultSublabel(r)}
                    </p>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Search results: Jobs */}
          {showSearchResults && jobs.length > 0 && (
            <Command.Group
              heading="Jobs"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              {jobs.map((r) => (
                <Command.Item
                  key={r.id}
                  value={getResultLabel(r)}
                  onSelect={() => navigate(getResultHref(r), getResultLabel(r))}
                  className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
                >
                  <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{getResultLabel(r)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {getResultSublabel(r)}
                    </p>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Actions */}
          <Command.Group
            heading="Actions"
            className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
          >
            <Command.Item
              value="Create customer"
              onSelect={() => navigate("/customers/new", "Create customer")}
              className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-slate-400" />
              Create customer
            </Command.Item>
            <Command.Item
              value="Create invoice"
              onSelect={() => navigate("/invoices/new", "Create invoice")}
              className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100"
            >
              <FilePlus className="h-4 w-4 shrink-0 text-slate-400" />
              Create invoice
            </Command.Item>
            <Command.Item
              value="Sign out"
              onSelect={handleSignOut}
              className="mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-600 aria-selected:bg-slate-100"
            >
              <LogOut className="h-4 w-4 shrink-0 text-red-400" />
              Sign out
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
