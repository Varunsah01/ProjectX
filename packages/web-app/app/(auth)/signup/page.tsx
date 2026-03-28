"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

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
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setErrors({
        form: result.error ?? "Unable to create your account.",
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

    router.push(signInResult.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
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

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Your full name"
          />
          {errors.name ? (
            <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@company.com"
          />
          {errors.email ? (
            <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Organization Name
          </label>
          <input
            type="text"
            value={form.organizationName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                organizationName: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Project X Services"
          />
          {errors.organizationName ? (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.organizationName}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Minimum 8 characters"
            />
            {errors.password ? (
              <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Re-enter password"
            />
            {errors.confirmPassword ? (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>

        {errors.form ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
