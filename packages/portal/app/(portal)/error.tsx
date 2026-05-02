"use client";

import { AlertTriangle } from "lucide-react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="mb-6 text-sm text-slate-600 max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
