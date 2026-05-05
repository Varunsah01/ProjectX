import Link from "next/link";
import Image from "next/image";
import { Lock, DatabaseBackup, ShieldCheck } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Before Project X, I was tracking 200+ AMC customers in Excel. Last quarter, I renewed 35 contracts I would have completely missed.",
    name: "Rajesh Kumar",
    role: "Owner",
    company: "KoolBreeze AC Services",
  },
  {
    quote:
      "My technicians now check in digitally for every visit. Complaints that used to take a week to resolve now close in 2 days.",
    name: "Priya Sharma",
    role: "Operations Manager",
    company: "PureFlow Water Solutions",
  },
  {
    quote:
      "The billing module alone saved us 15 hours a week. Automated invoices, payment reminders on WhatsApp, and a clear dashboard showing who owes what.",
    name: "Mohammed Farhan",
    role: "Director",
    company: "SecureVision CCTV Services",
  },
];

function BrandPanel() {
  // Rotate testimonial by day of week for variety
  const testimonial = TESTIMONIALS[new Date().getDay() % TESTIMONIALS.length];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-50 via-white to-accent-50 p-10 lg:p-12">
      {/* Value statement */}
      <div>
        <p className="text-2xl font-bold leading-tight text-slate-900 lg:text-3xl">
          The operating system for India&apos;s recurring service businesses.
        </p>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          Customers, billing, complaints, technicians, and contracts — managed
          from one platform.
        </p>
      </div>

      {/* Testimonial */}
      <div className="my-8 rounded-xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
        <blockquote className="text-sm text-slate-700 leading-relaxed">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {testimonial.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {testimonial.name}
            </p>
            <p className="text-xs text-slate-500">
              {testimonial.role}, {testimonial.company}
            </p>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          256-bit TLS
        </span>
        <span className="flex items-center gap-1.5">
          <DatabaseBackup className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          Daily backups
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          DPDP-aware data handling
        </span>
      </div>

      {/* Screenshot anchor (clipped at bottom) */}
      <div className="absolute -bottom-8 -right-8 w-[70%] opacity-[0.08]">
        <Image
          src="/hero-dashboard-light.png"
          alt=""
          width={1440}
          height={900}
          className="rounded-tl-2xl"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Form column */}
      <div className="relative flex w-full flex-col lg:w-5/12">
        {/* Mobile brand strip */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 to-accent-50 px-6 py-4 lg:hidden">
          <Link href="/login" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              PX
            </span>
            <span className="text-sm font-semibold text-slate-900">
              Project X
            </span>
          </Link>
        </div>

        {/* Form area */}
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          {/* Desktop logo */}
          <div className="mb-10 hidden lg:block">
            <Link href="/login" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
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

          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>

      {/* Brand panel — desktop only */}
      <div className="hidden lg:block lg:w-7/12">
        <div className="sticky top-0 h-screen border-l border-slate-100">
          <BrandPanel />
        </div>
      </div>
    </div>
  );
}
