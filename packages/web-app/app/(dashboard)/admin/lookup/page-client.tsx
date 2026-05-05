"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, FileText, Ticket, User, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { lookupAccountAction, type LookupResults, type LookupUser } from "@/lib/actions/lookup";

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function LookupPageClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupResults | null>(null);
  const [isPending, startTransition] = useTransition();
  const [impersonateTarget, setImpersonateTarget] = useState<LookupUser | null>(null);
  const [reason, setReason] = useState("");
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    startTransition(async () => {
      const res = await lookupAccountAction(query);
      setResults(res);
    });
  }

  async function handleImpersonate() {
    if (!impersonateTarget) return;
    if (reason.trim().length < 20) {
      setImpersonateError("Reason must be at least 20 characters");
      return;
    }
    setImpersonating(true);
    setImpersonateError("");
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: impersonateTarget.id, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImpersonateError(data.error ?? "Failed to start impersonation");
        return;
      }
      setImpersonateTarget(null);
      setReason("");
      router.push("/");
      router.refresh();
    } catch {
      setImpersonateError("Network error. Please try again.");
    } finally {
      setImpersonating(false);
    }
  }

  const hasResults = results && (
    results.users.length > 0 ||
    results.orgs.length > 0 ||
    results.invoices.length > 0 ||
    results.tickets.length > 0
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Account Lookup"
        subtitle="Search by email, phone, name, org name, invoice #, Razorpay payment ID, or ticket ID"
      />

      <form onSubmit={handleSearch} className="mb-8 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            minLength={3}
          />
        </div>
        <button
          type="submit"
          disabled={isPending || query.trim().length < 3}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {results && !hasResults && (
        <p className="text-center text-sm text-slate-500">No results found for &quot;{query}&quot;</p>
      )}

      {/* Users */}
      {results && results.users.length > 0 && (
        <Section title="Users" icon={<User className="h-4 w-4" />}>
          {results.users.map((u) => (
            <ResultRow
              key={u.id}
              primary={u.name}
              secondary={`${u.email}${u.phone ? ` · ${u.phone}` : ""}`}
              badge={u.role}
              meta={u.orgName}
              action={
                u.role !== "SUPPORT" ? (
                  <button
                    onClick={() => { setImpersonateTarget(u); setReason(""); setImpersonateError(""); }}
                    className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                  >
                    Impersonate
                  </button>
                ) : null
              }
            />
          ))}
        </Section>
      )}

      {/* Organizations */}
      {results && results.orgs.length > 0 && (
        <Section title="Organizations" icon={<Building2 className="h-4 w-4" />}>
          {results.orgs.map((o) => (
            <ResultRow
              key={o.id}
              primary={o.name}
              secondary={`${o.email} · ${o.phone}`}
              meta={`/${o.slug}`}
            />
          ))}
        </Section>
      )}

      {/* Invoices */}
      {results && results.invoices.length > 0 && (
        <Section title="Invoices" icon={<FileText className="h-4 w-4" />}>
          {results.invoices.map((inv) => (
            <ResultRow
              key={inv.id}
              primary={inv.invoiceNumber}
              secondary={inv.customerName}
              badge={inv.status}
              meta={`₹${paiseToRupees(inv.amount)}`}
              href={`/invoices/${inv.id}`}
            />
          ))}
        </Section>
      )}

      {/* Tickets */}
      {results && results.tickets.length > 0 && (
        <Section title="Tickets" icon={<Ticket className="h-4 w-4" />}>
          {results.tickets.map((t) => (
            <ResultRow
              key={t.id}
              primary={t.subject}
              secondary={t.customerName}
              badge={t.status}
              href={`/complaints/${t.id}`}
            />
          ))}
        </Section>
      )}

      {/* Impersonate Modal */}
      <Modal
        isOpen={!!impersonateTarget}
        onClose={() => { setImpersonateTarget(null); setReason(""); setImpersonateError(""); }}
        title="Start Impersonation Session"
        size="sm"
      >
        {impersonateTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{impersonateTarget.name}</p>
              <p className="text-slate-500">{impersonateTarget.email} · {impersonateTarget.orgName}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason <span className="text-slate-400">(min 20 characters)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setImpersonateError(""); }}
                rows={3}
                placeholder="e.g. Customer reported dashboard not loading — investigating layout issue"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              {impersonateError && (
                <p className="mt-1 text-xs text-red-600">{impersonateError}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {reason.trim().length}/20 min · Session expires in 15 minutes · All actions are logged
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setImpersonateTarget(null); setReason(""); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <SubmitButton
                type="button"
                onClick={handleImpersonate}
                disabled={impersonating || reason.trim().length < 20}
                loading={impersonating}
                loadingText="Starting…"
              >
                Start Session
              </SubmitButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        <span>{title}</span>
      </div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {children}
      </div>
    </div>
  );
}

function ResultRow({
  primary,
  secondary,
  badge,
  meta,
  href,
  action,
}: {
  primary: string;
  secondary?: string;
  badge?: string;
  meta?: string;
  href?: string;
  action?: React.ReactNode;
}) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{primary}</p>
        {secondary && <p className="truncate text-xs text-slate-500">{secondary}</p>}
      </div>
      {meta && <span className="shrink-0 text-xs text-slate-400">{meta}</span>}
      {badge && (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {badge}
        </span>
      )}
      {action && <div className="shrink-0">{action}</div>}
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:bg-slate-50">
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}
