"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { useAuthBranding } from "@/components/providers/AuthBrandingProvider";

export default function LoginPage() {
  const { orgName, orgLogo } = useAuthBranding();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("email", {
        email: email.trim().toLowerCase(),
        redirect: false,
      });

      if (result?.error) {
        setError("Unable to send login link. Please check your email and try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Check your email</h1>
        <p className="mb-6 text-sm text-slate-600">
          We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to
          access your account.
        </p>
        <p className="text-xs text-slate-500">
          The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        {orgLogo ? (
          <Image
            src={orgLogo}
            alt={orgName || "Logo"}
            width={48}
            height={48}
            className="mx-auto mb-4 h-12 w-12 rounded-2xl object-contain"
          />
        ) : (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
            <span className="text-2xl font-bold text-white">
              {orgName ? orgName.charAt(0).toUpperCase() : "R"}
            </span>
          </div>
        )}
        <h1 className="text-xl font-semibold text-slate-900">
          {orgName || "Customer Portal"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in with your email to access your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending link...
            </>
          ) : (
            <>
              Send sign-in link
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        We&apos;ll send you a magic link to sign in. No password needed.
      </p>
    </div>
  );
}
