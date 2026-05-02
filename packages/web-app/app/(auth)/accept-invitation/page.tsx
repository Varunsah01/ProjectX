"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type InvitationData = {
  email: string;
  role: string;
  orgName: string;
  userExists: boolean;
};

type FormErrors = {
  name?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }

    fetch(`/api/auth/accept-invitation?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json()) as { success?: boolean; error?: string; data?: InvitationData };
        if (!res.ok || !data.success) {
          setError(data.error ?? "Invalid invitation.");
        } else {
          setInvitation(data.data!);
        }
      })
      .catch(() => setError("Failed to validate invitation."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAcceptExisting() {
    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        setErrors({ form: data.error ?? "Failed to accept invitation." });
        setIsSubmitting(false);
        return;
      }

      router.push("/login?message=Invitation accepted. Please sign in.");
    } catch {
      setErrors({ form: "Something went wrong." });
      setIsSubmitting(false);
    }
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
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

    try {
      const res = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: form.name.trim(),
          password: form.password,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        setErrors({ form: data.error ?? "Failed to create account." });
        setIsSubmitting(false);
        return;
      }

      // Auto sign in
      const signInResult = await signIn("credentials", {
        email: invitation!.email,
        password: form.password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!signInResult || signInResult.error) {
        router.push("/login?message=Account created. Please sign in.");
        return;
      }

      router.push(signInResult.url ?? "/");
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong." });
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Invalid Invitation</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  if (!invitation) return null;

  // Existing user — just accept
  if (invitation.userExists) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
            Invitation
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Join {invitation.orgName}
          </h1>
          <p className="text-sm text-slate-500">
            You&rsquo;ve been invited to join as a team member.
          </p>
        </div>

        <div className="mb-6 space-y-2 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Organization</span>
            <span className="font-medium text-slate-900">{invitation.orgName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-900 capitalize">{invitation.role.toLowerCase()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{invitation.email}</span>
          </div>
        </div>

        {errors.form ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.form}
          </div>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleAcceptExisting}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
        >
          {isSubmitting ? "Accepting..." : "Accept Invitation"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Wrong account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in with a different account
          </Link>
        </p>
      </div>
    );
  }

  // New user — registration form
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
          Create Account
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Join {invitation.orgName}
        </h1>
        <p className="text-sm text-slate-500">
          Set up your account to accept the invitation.
        </p>
      </div>

      <div className="mb-6 space-y-2 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Email</span>
          <span className="font-medium text-slate-900">{invitation.email}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Role</span>
          <span className="font-medium text-slate-900 capitalize">{invitation.role.toLowerCase()}</span>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleCreateAccount}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Your full name"
          />
          {errors.name ? (
            <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>
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
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
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
              onChange={(e) => setForm((c) => ({ ...c, confirmPassword: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Re-enter password"
            />
            {errors.confirmPassword ? (
              <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
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
          {isSubmitting ? "Creating account..." : "Create Account & Join"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
