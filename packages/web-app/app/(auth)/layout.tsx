import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_45%,#f8fafc_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-full bg-white/85 px-4 py-2 shadow-sm ring-1 ring-slate-200 backdrop-blur"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-sm">
              PX
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-slate-900">
                Project X
              </span>
              <span className="block text-xs text-slate-500">
                Service Operations
              </span>
            </span>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
