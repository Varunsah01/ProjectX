import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          Page not found
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
