"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");

  async function handleResend() {
    setResending(true);
    setResendError("");

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
      });

      if (response.status === 429) {
        setResendError("Please wait a moment before requesting again.");
      } else if (response.status === 401) {
        setResendError("You need to be signed in to resend the verification email.");
      } else {
        setResent(true);
      }
    } catch {
      setResendError("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="mb-4 text-3xl font-semibold text-slate-900">
          Email verified
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Your email address has been verified successfully.
        </p>
        <Link
          href="/"
          className="inline-block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="mb-4 text-3xl font-semibold text-slate-900">
          Verification failed
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {error === "expired"
            ? "This verification link has expired. Please request a new one."
            : "This verification link is invalid."}
        </p>

        {resent ? (
          <p className="text-sm text-green-600">
            A new verification email has been sent. Check your inbox.
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
          >
            {resending ? "Sending..." : "Resend Verification Email"}
          </button>
        )}

        {resendError ? (
          <p className="mt-3 text-center text-xs text-red-600">
            {resendError}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  // Default: no params — informational page
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
      <h1 className="mb-4 text-3xl font-semibold text-slate-900">
        Verify your email
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Check your email for a verification link. If you didn&apos;t receive it,
        you can request a new one.
      </p>

      {resent ? (
        <p className="text-sm text-green-600">
          A new verification email has been sent. Check your inbox.
        </p>
      ) : (
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
        >
          {resending ? "Sending..." : "Resend Verification Email"}
        </button>
      )}

      {resendError ? (
        <p className="mt-3 text-center text-xs text-red-600">{resendError}</p>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link
          href="/"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Go to Dashboard
        </Link>
      </p>
    </div>
  );
}
