"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!session?.user || session.user.isEmailVerified || dismissed) {
    return null;
  }

  async function handleResend() {
    setSending(true);

    try {
      await fetch("/api/auth/send-verification", { method: "POST" });
      setSent(true);
    } catch {
      // Silently fail — the user can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:mx-6">
      <svg
        className="h-5 w-5 flex-shrink-0 text-amber-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <p className="flex-1 text-sm text-amber-800">
        Please verify your email address.{" "}
        {sent ? (
          <span className="font-medium text-green-700">
            Verification email sent!
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Resend email"}
          </button>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 rounded-lg p-1 text-amber-600 hover:bg-amber-100"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
