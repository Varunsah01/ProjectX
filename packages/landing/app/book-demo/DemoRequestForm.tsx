"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

// ─── Types ───────────────────────────────────────────────────────────────────

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  scale: string;
  currentTools: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;
type FormStatus = "idle" | "submitting" | "success" | "error";

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

const SCALE_OPTIONS = [
  { value: "under-100", label: "Under 100 customers" },
  { value: "100-500", label: "100 – 500 customers" },
  { value: "500-2000", label: "500 – 2,000 customers" },
  { value: "2000+", label: "2,000+ customers" },
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
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 mb-1.5"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

const EMPTY: FormData = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  industry: "",
  scale: "",
  currentTools: "",
  message: "",
};

function validate(d: FormData): FormErrors {
  const e: FormErrors = {};
  if (!d.fullName.trim() || d.fullName.trim().length < 2)
    e.fullName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
    e.email = "Please enter a valid work email address.";
  if (!d.phone.trim() || d.phone.replace(/\D/g, "").length < 10)
    e.phone = "Please enter a valid 10-digit phone number.";
  if (!d.company.trim())
    e.company = "Please enter your business name.";
  if (!d.industry)
    e.industry = "Please select your industry.";
  if (!d.scale)
    e.scale = "Please select your customer count.";
  return e;
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-green-100 bg-green-50/40 px-8 py-16 text-center min-h-[480px]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-slate-900">
        Demo Request Received
      </h2>
      <p className="mt-3 max-w-sm text-slate-600 leading-relaxed">
        Thanks,{" "}
        <strong className="font-semibold text-slate-800">
          {name.split(" ")[0]}
        </strong>
        . We will review your details and reach out within{" "}
        <strong className="font-semibold text-slate-800">
          1 business day
        </strong>{" "}
        to confirm a time.
      </p>
      <p className="mt-3 text-sm text-slate-400">
        A confirmation has been sent to{" "}
        <span className="font-medium text-slate-500">{email}</span>.
      </p>
      <a
        href="/"
        className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
      >
        ← Back to homepage
      </a>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function DemoRequestForm() {
  const [data, setData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  const set =
    (field: keyof FormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      setData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error on change
      if (errors[field])
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("idle");

    const errs = validate(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to the first visible error message
      requestAnimationFrame(() => {
        document
          .querySelector("[role='alert']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return <SuccessCard name={data.fullName} email={data.email} />;
  }

  const busy = status === "submitting";
  const isError = status === "error";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Demo request form"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-5">
        {/* Row 1: Name + Email */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="fullName"
            label="Full name"
            required
            error={errors.fullName}
          >
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Rajesh Kumar"
              value={data.fullName}
              onChange={set("fullName")}
              disabled={busy}
              required
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              className={inputCls(!!errors.fullName)}
            />
          </Field>

          <Field
            id="email"
            label="Work email"
            required
            error={errors.email}
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="rajesh@coolbreeze.in"
              value={data.email}
              onChange={set("email")}
              disabled={busy}
              required
              aria-describedby={errors.email ? "email-error" : undefined}
              className={inputCls(!!errors.email)}
            />
          </Field>
        </div>

        {/* Row 2: Phone + Company */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="phone"
            label="Phone number"
            required
            error={errors.phone}
            hint="Used only to confirm your demo slot."
          >
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={data.phone}
              onChange={set("phone")}
              disabled={busy}
              required
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={inputCls(!!errors.phone)}
            />
          </Field>

          <Field
            id="company"
            label="Business name"
            required
            error={errors.company}
          >
            <input
              id="company"
              type="text"
              autoComplete="organization"
              placeholder="KoolBreeze AC Services"
              value={data.company}
              onChange={set("company")}
              disabled={busy}
              required
              aria-describedby={errors.company ? "company-error" : undefined}
              className={inputCls(!!errors.company)}
            />
          </Field>
        </div>

        {/* Row 3: Industry + Scale */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="industry"
            label="Industry / business type"
            required
            error={errors.industry}
          >
            <select
              id="industry"
              value={data.industry}
              onChange={set("industry")}
              disabled={busy}
              required
              aria-describedby={
                errors.industry ? "industry-error" : undefined
              }
              className={cn(inputCls(!!errors.industry), "cursor-pointer")}
            >
              <option value="" disabled>
                Select your industry
              </option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="scale"
            label="Customer count"
            required
            error={errors.scale}
          >
            <select
              id="scale"
              value={data.scale}
              onChange={set("scale")}
              disabled={busy}
              required
              aria-describedby={errors.scale ? "scale-error" : undefined}
              className={cn(inputCls(!!errors.scale), "cursor-pointer")}
            >
              <option value="" disabled>
                Select a range
              </option>
              {SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Current tools (optional) */}
        <Field
          id="currentTools"
          label="Current tools used"
          error={errors.currentTools}
          hint="e.g. Excel, WhatsApp, Tally, a custom system, or nothing at all."
        >
          <input
            id="currentTools"
            type="text"
            placeholder="Excel, WhatsApp, paper registers…"
            value={data.currentTools}
            onChange={set("currentTools")}
            disabled={busy}
            className={inputCls(!!errors.currentTools)}
          />
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
            rows={4}
            placeholder="e.g. We struggle most with tracking overdue payments and knowing where our technicians are at any given time…"
            value={data.message}
            onChange={set("message")}
            disabled={busy}
            className={cn(inputCls(!!errors.message), "resize-none")}
          />
        </Field>

        {/* Submission error */}
        {status === "error" && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Something went wrong. Please try again or email us directly.
          </div>
        )}

        {/* Submit */}
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={busy}
            className="w-full justify-center"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Request Demo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-400">
            We will get back to you within 1 business day.{" "}
            No commitment required.
          </p>
        </div>
      </div>
    </form>
  );
}
