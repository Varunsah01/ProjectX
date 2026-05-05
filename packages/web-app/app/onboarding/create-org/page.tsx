"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Building2, UserPlus } from "lucide-react";

type Invitation = {
  id: string;
  orgName: string;
  role: string;
  token: string;
};

type Consents = {
  SERVICE_DELIVERY: boolean;
  COMMUNICATION: boolean;
  ANALYTICS: boolean;
  MARKETING: boolean;
};

export default function CreateOrgPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);

  // "create" | "join" — user can switch even if invitation exists
  const [mode, setMode] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [consents, setConsents] = useState<Consents>({
    SERVICE_DELIVERY: false,
    COMMUNICATION: false,
    ANALYTICS: false,
    MARKETING: false,
  });
  const [showOptional, setShowOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Check for a pending invitation for this user's email
  useEffect(() => {
    fetch("/api/onboarding/invitation-check")
      .then((r) => r.json())
      .then((data: { invitation?: Invitation }) => {
        if (data.invitation) {
          setInvitation(data.invitation);
          setMode("join");
        }
      })
      .catch(() => {/* ignore — user can still create org */})
      .finally(() => setInviteChecked(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!consents.SERVICE_DELIVERY) {
      setFormError("You must agree to the Terms and Privacy Policy to continue.");
      return;
    }

    if (mode === "create" && !orgName.trim()) {
      setFormError("Organization name is required.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    const grantedConsents = Object.entries(consents)
      .filter(([, granted]) => granted)
      .map(([purpose]) => purpose);

    const body =
      mode === "join" && invitation
        ? { mode: "join", invitationToken: invitation.token, consents: grantedConsents }
        : { mode: "create", orgName: orgName.trim(), consents: grantedConsents };

    const res = await fetch("/api/onboarding/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCsrfToken(),
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      activeOrgId?: string;
      activeRole?: string;
      memberships?: unknown;
    };

    if (!res.ok || !data.ok) {
      setFormError(data.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // Update JWT with new org membership
    await updateSession({
      activeOrgId:  data.activeOrgId,
      activeRole:   data.activeRole,
      memberships:  data.memberships,
    });

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-lg shadow-brand-500/25">
            PX
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            One last step
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your workspace to get started.
          </p>
        </div>

        {/* Invitation offer (shown when a matching invitation exists) */}
        {inviteChecked && invitation && (
          <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-start gap-3">
              <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-brand-800">
                  You have a pending invitation
                </p>
                <p className="mt-0.5 text-sm text-brand-700">
                  Join <strong>{invitation.orgName}</strong> as{" "}
                  {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("join")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      mode === "join"
                        ? "bg-brand-600 text-white"
                        : "border border-brand-300 text-brand-700 hover:bg-brand-100"
                    }`}
                  >
                    Join {invitation.orgName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      mode === "create"
                        ? "bg-slate-700 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Create a new organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Org name field (only shown in "create" mode) */}
          {mode === "create" && (
            <div>
              <label
                htmlFor="onboarding-org-name"
                className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700"
              >
                <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Organization name
              </label>
              <input
                id="onboarding-org-name"
                type="text"
                autoComplete="organization"
                autoFocus
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Your company name"
              />
            </div>
          )}

          {/* Consent: SERVICE_DELIVERY (required) */}
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={consents.SERVICE_DELIVERY}
              onChange={(e) =>
                setConsents((c) => ({ ...c, SERVICE_DELIVERY: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600">
              By creating an account you agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          {/* Optional consent preferences */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
              aria-expanded={showOptional}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              Optional preferences
            </button>
            {showOptional && (
              <div className="mt-3 space-y-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={consents.COMMUNICATION}
                    onChange={(e) =>
                      setConsents((c) => ({ ...c, COMMUNICATION: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-600">
                    Service updates, reminders, and notifications
                  </span>
                </label>
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={consents.ANALYTICS}
                    onChange={(e) =>
                      setConsents((c) => ({ ...c, ANALYTICS: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-600">
                    Usage analytics to improve the product
                  </span>
                </label>
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={consents.MARKETING}
                    onChange={(e) =>
                      setConsents((c) => ({ ...c, MARKETING: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-600">
                    Product updates and promotional offers
                  </span>
                </label>
              </div>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
          >
            {isSubmitting
              ? "Setting up…"
              : mode === "join"
              ? `Join ${invitation?.orgName ?? "organization"}`
              : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Read the CSRF token from the cookie set by middleware. */
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}
