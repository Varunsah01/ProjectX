"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { track, Events } from "@/lib/analytics";
import { submitDemoRequest, type ActionState } from "./actions";

// ─── Select options ───────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Water Purifier Servicing",
  "AC & HVAC Maintenance",
  "CCTV & Security Systems",
  "Solar Panel Maintenance",
  "Elevator Maintenance",
  "Broadband & ISP Services",
  "Appliance Servicing",
  "Fire Safety & Equipment",
  "Pest Control Services",
  "Facility Maintenance",
  "Other",
];

const COMPANY_SIZE_OPTIONS = [
  { value: "under-100", label: "Under 100 customers" },
  { value: "100-500", label: "100 – 500 customers" },
  { value: "500-2000", label: "500 – 2,000 customers" },
  { value: "2000+", label: "2,000+ customers" },
];

const ROLE_OPTIONS = [
  "Owner / Founder",
  "Managing Director / CEO",
  "Operations Manager",
  "Sales Manager",
  "Finance Manager",
  "IT Manager",
  "Other",
];

const PREFERRED_CONTACT_OPTIONS = [
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Email", label: "Email" },
  { value: "Phone", label: "Phone call" },
];

// ─── Shared input styling ─────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border px-4 py-3 text-sm text-slate-900",
    "placeholder:text-slate-400",
    "transition-colors duration-200",
    "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    hasError
      ? "border-red-300 bg-red-50/40"
      : "border-slate-200 bg-white hover:border-slate-300"
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const INITIAL_STATE: ActionState = { status: "idle" };

function SubmitButton({ errors }: { errors: Partial<Record<string, string>> }) {
  const { pending } = useFormStatus();
  return (
    <div className="pt-1">
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="w-full justify-center"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting…
          </>
        ) : (
          <>
            Request Demo
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-slate-400">
        We will get back to you within 1 business day. No commitment required.
      </p>
    </div>
  );
}

export function DemoRequestForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(submitDemoRequest, INITIAL_STATE);
  const firstErrorRef = useRef<HTMLElement | null>(null);

  // Fire analytics and redirect on success
  useEffect(() => {
    if (state.status !== "success") return;
    track(Events.DEMO_REQUEST_SUBMITTED, {
      industry: state.industry,
      companySize: state.companySize,
    });
    router.push(
      `/book-demo/thanks?name=${encodeURIComponent(state.firstName)}&email=${encodeURIComponent(state.email)}`,
    );
  }, [state, router]);

  // Scroll to first error on validation failure
  useEffect(() => {
    if (state.status !== "error") return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("[role='alert']");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstErrorRef.current = el;
    });
  }, [state]);

  const errors = state.status === "error" ? state.fieldErrors : {};
  const formError = state.status === "error" ? state.formError : undefined;

  return (
    <form
      action={formAction}
      noValidate
      aria-label="Demo request form"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-5">
        {/* Row 1: Name + Email */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="fullName" label="Full name" required error={errors.fullName}>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Rajesh Kumar"

              required
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              className={inputCls(!!errors.fullName)}
            />
          </Field>

          <Field id="email" label="Work email" required error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="rajesh@coolbreeze.in"

              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={inputCls(!!errors.email)}
            />
          </Field>
        </div>

        {/* Row 2: Company + Role */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="company" label="Business name" required error={errors.company}>
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="KoolBreeze AC Services"

              required
              aria-invalid={!!errors.company}
              aria-describedby={errors.company ? "company-error" : undefined}
              className={inputCls(!!errors.company)}
            />
          </Field>

          <Field id="role" label="Your role" error={errors.role}>
            <select
              id="role"
              name="role"

              aria-describedby={errors.role ? "role-error" : undefined}
              className={cn(inputCls(!!errors.role), "cursor-pointer")}
            >
              <option value="">Select your role</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Row 3: Industry + Company size */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="industry" label="Industry / business type" required error={errors.industry}>
            <select
              id="industry"
              name="industry"

              required
              aria-invalid={!!errors.industry}
              aria-describedby={errors.industry ? "industry-error" : undefined}
              className={cn(inputCls(!!errors.industry), "cursor-pointer")}
            >
              <option value="" disabled>Select your industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </Field>

          <Field id="companySize" label="Customer count" error={errors.companySize}>
            <select
              id="companySize"
              name="companySize"

              aria-describedby={errors.companySize ? "companySize-error" : undefined}
              className={cn(inputCls(!!errors.companySize), "cursor-pointer")}
            >
              <option value="">Select a range</option>
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Preferred contact */}
        <Field
          id="preferredContact"
          label="Preferred contact method"
          required
          error={errors.preferredContact}
          hint="How should we reach you to confirm your demo slot?"
        >
          <div
            role="group"
            aria-labelledby="preferredContact-label"
            className="flex flex-wrap gap-3 mt-0.5"
          >
            {PREFERRED_CONTACT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  "has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700",
                  errors.preferredContact ? "border-red-300 bg-red-50/40" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <input
                  type="radio"
                  name="preferredContact"
                  value={opt.value}
    
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {errors.preferredContact && (
            <p id="preferredContact-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.preferredContact}
            </p>
          )}
        </Field>

        {/* Message (optional) */}
        <Field
          id="message"
          label="Anything specific you'd like to see?"
          error={errors.message}
          hint="Optional — helps us tailor the demo to your biggest pain points."
        >
          <textarea
            id="message"
            name="message"
            rows={4}
            placeholder="e.g. We struggle most with tracking overdue payments and knowing where our technicians are…"
            className={cn(inputCls(!!errors.message), "resize-none")}
          />
        </Field>

        {/* Form-level error */}
        {formError && (
          <div role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}
        {state.status === "error" && !formError && Object.keys(errors).length === 0 && (
          <div role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Something went wrong. Please try again.
          </div>
        )}

        {/* Submit */}
        <SubmitButton errors={errors} />
      </div>
    </form>
  );
}
