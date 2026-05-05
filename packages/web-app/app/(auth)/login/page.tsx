"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

const REMEMBER_ME_KEY = "auth:remembered_email";

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Prefill email from ?email= param (redirect from signup duplicate) or from localStorage
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const remembered = localStorage.getItem(REMEMBER_ME_KEY);
    if (emailParam) {
      setForm((f) => ({ ...f, email: emailParam }));
    } else if (remembered) {
      setForm((f) => ({ ...f, email: remembered }));
      setRememberMe(true);
    }
  }, []); // intentionally run once on mount

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.password) nextErrors.password = "Password is required.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      setErrors({ form: "Invalid email or password." });
      setIsSubmitting(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, form.email.trim());
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
          Welcome Back
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500">
          Use your workspace credentials to access the dashboard.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) =>
              setForm((c) => ({ ...c, email: e.target.value }))
            }
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@company.com"
          />
          {errors.email ? (
            <p id="login-email-error" className="mt-1.5 text-xs text-red-600">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) =>
                setForm((c) => ({ ...c, password: e.target.value }))
              }
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Enter your password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password ? (
            <p
              id="login-password-error"
              className="mt-1.5 text-xs text-red-600"
            >
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="login-remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <label
            htmlFor="login-remember-me"
            className="text-sm text-slate-600"
          >
            Remember me
          </label>
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
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>

        <Link
          href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Don&apos;t have a workspace? Start free
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </form>
    </>
  );
}
