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
  const oauthError  = searchParams.get("error");
  const oauthHint   = searchParams.get("hint") ?? "";
  const [form, setForm] = useState({ email: oauthHint, password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Prefill email from ?email= / ?hint= params (redirect from signup duplicate or
  // OAuth conflict) or from localStorage "remember me".
  useEffect(() => {
    const emailParam = searchParams.get("email") ?? searchParams.get("hint");
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

      {oauthError === "OAuthAccountNotLinked" && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
        >
          This email is already registered with a password. Sign in with your
          password below — you can link Google in your account settings
          afterwards.
        </div>
      )}

      {/* Google sign-in */}
      <button
        type="button"
        disabled={isGoogleLoading}
        onClick={() => {
          setIsGoogleLoading(true);
          signIn("google", { callbackUrl });
        }}
        className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Google "G" logo */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-400">or</span>
        </div>
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
