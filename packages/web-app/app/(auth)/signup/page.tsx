"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
import { track, Events } from "@/lib/analytics";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";

type SignupErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  organizationName?: string;
  form?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
  });
  const [consents, setConsents] = useState({
    SERVICE_DELIVERY: false,
    COMMUNICATION: false,
    ANALYTICS: false,
    MARKETING: false,
  });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOptionalConsents, setShowOptionalConsents] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SignupErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    }

    if (!form.organizationName.trim()) {
      nextErrors.organizationName = "Organization name is required.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!consents.SERVICE_DELIVERY) {
      nextErrors.form =
        "You must agree to the Terms and Privacy Policy to create an account.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        organizationName: form.organizationName.trim(),
        consents: Object.entries(consents)
          .filter(([, granted]) => granted)
          .map(([purpose]) => purpose),
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      if (response.status === 409) {
        router.push(
          `/login?email=${encodeURIComponent(form.email.trim())}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
        return;
      }

      setErrors({
        form:
          result.error ??
          "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
      callbackUrl,
    });

    if (!signInResult || signInResult.error) {
      setErrors({
        form: "Your account was created, but automatic sign-in failed.",
      });
      setIsSubmitting(false);
      return;
    }

    track(Events.SIGNUP_COMPLETED);
    router.push(signInResult.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
          New Workspace
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Create your account
        </h1>
        <p className="text-sm text-slate-500">
          Start with an admin account and one organization.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="signup-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) =>
              setForm((c) => ({ ...c, name: e.target.value }))
            }
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "signup-name-error" : undefined}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Your full name"
          />
          {errors.name ? (
            <p id="signup-name-error" className="mt-1.5 text-xs text-red-600">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) =>
              setForm((c) => ({ ...c, email: e.target.value }))
            }
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@company.com"
          />
          {errors.email ? (
            <p
              id="signup-email-error"
              className="mt-1.5 text-xs text-red-600"
            >
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="signup-org-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Organization Name
          </label>
          <input
            id="signup-org-name"
            type="text"
            autoComplete="organization"
            value={form.organizationName}
            onChange={(e) =>
              setForm((c) => ({ ...c, organizationName: e.target.value }))
            }
            aria-invalid={!!errors.organizationName}
            aria-describedby={
              errors.organizationName ? "signup-org-name-error" : undefined
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Your company name"
          />
          {errors.organizationName ? (
            <p
              id="signup-org-name-error"
              className="mt-1.5 text-xs text-red-600"
            >
              {errors.organizationName}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="signup-password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) =>
                  setForm((c) => ({ ...c, password: e.target.value }))
                }
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "signup-password-error" : undefined
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-[18px] -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthMeter password={form.password} />
            {errors.password ? (
              <p
                id="signup-password-error"
                className="mt-1.5 text-xs text-red-600"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="signup-confirm-password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((c) => ({ ...c, confirmPassword: e.target.value }))
                }
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword
                    ? "signup-confirm-password-error"
                    : undefined
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirmPassword}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2.5 top-[18px] -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p
                id="signup-confirm-password-error"
                className="mt-1.5 text-xs text-red-600"
              >
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>

        {/* Consent: SERVICE_DELIVERY inline */}
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={consents.SERVICE_DELIVERY}
            onChange={(e) =>
              setConsents((c) => ({
                ...c,
                SERVICE_DELIVERY: e.target.checked,
              }))
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

        {/* Optional preferences — collapsed by default */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptionalConsents((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            aria-expanded={showOptionalConsents}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showOptionalConsents ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            Optional preferences
          </button>
          {showOptionalConsents && (
            <div className="mt-3 space-y-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={consents.COMMUNICATION}
                  onChange={(e) =>
                    setConsents((c) => ({
                      ...c,
                      COMMUNICATION: e.target.checked,
                    }))
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

        {errors.form ? (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errors.form}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
