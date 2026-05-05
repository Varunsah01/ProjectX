"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, X } from "lucide-react";
import { dismissOnboardingAction } from "@/lib/actions/onboarding";
import type { OnboardingStatus } from "@/lib/types";

const STEPS: {
  key: keyof OnboardingStatus["steps"];
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}[] = [
  {
    key: "hasProfile",
    title: "Add your business profile",
    description: "Add GST number, legal name, and bank details for invoicing",
    href: "/settings",
    ctaLabel: "Go to Settings",
  },
  {
    key: "hasCustomers",
    title: "Add your first customer",
    description: "Import or create a customer to start managing relationships",
    href: "/customers/new",
    ctaLabel: "Add Customer",
  },
  {
    key: "hasInvoices",
    title: "Create your first invoice",
    description: "Bill a customer and track payments",
    href: "/invoices/new",
    ctaLabel: "Create Invoice",
  },
  {
    key: "hasTeamMembers",
    title: "Invite a teammate",
    description: "Add technicians, managers, or agents to your org",
    href: "/settings/team",
    ctaLabel: "Invite",
  },
  {
    key: "hasPlans",
    title: "Set up a service plan",
    description: "Define AMC or warranty plans to attach to contracts",
    href: "/settings/plans",
    ctaLabel: "Add Plan",
  },
];

export function OnboardingChecklist({ onboarding }: { onboarding: OnboardingStatus }) {
  const router = useRouter();
  const [localDismissed, setLocalDismissed] = useState(false);

  const allComplete = Object.values(onboarding.steps).every(Boolean);

  if (onboarding.dismissed || localDismissed || allComplete) return null;

  const completedCount = Object.values(onboarding.steps).filter(Boolean).length;
  const progressPct = (completedCount / STEPS.length) * 100;

  async function handleDismiss() {
    setLocalDismissed(true);
    await dismissOnboardingAction();
    router.refresh();
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Progress bar */}
      <div className="h-[3px] w-full bg-slate-100">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="px-5 py-4">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Get started with Recuring</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {completedCount} of {STEPS.length} steps complete
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="ml-4 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps */}
        <ul className="space-y-1">
          {STEPS.map((step) => {
            const done = onboarding.steps[step.key];
            return (
              <li
                key={step.key}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      done
                        ? "text-sm text-slate-400 line-through"
                        : "text-sm font-medium text-slate-800"
                    }
                  >
                    {step.title}
                  </p>
                  {!done && (
                    <p className="text-xs text-slate-400">{step.description}</p>
                  )}
                </div>
                {!done && (
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    {step.ctaLabel}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
