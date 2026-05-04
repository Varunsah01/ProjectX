import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
        <Mail className="h-6 w-6 text-brand-600" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Check your inbox
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        We sent a sign-in link to your email address. Click the link to access
        your account.
      </p>
      <p className="text-xs text-slate-500">
        The link expires in 15 minutes. Check your spam folder if you
        don&apos;t see it.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Back to login
      </Link>
    </div>
  );
}
