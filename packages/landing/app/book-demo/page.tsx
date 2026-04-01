import type { Metadata } from "next";
import { CalendarDays, MessageSquare, Presentation } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { DemoRequestForm } from "./DemoRequestForm";

export const metadata: Metadata = {
  title: "Book a Demo | Project X",
  description:
    "See Project X in action with a personalised walkthrough for your service business. We tailor every demo to your industry, team size, and current workflows.",
};

// ─── Static content ───────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    Icon: MessageSquare,
    title: "Submit your details",
    description:
      "Tell us about your business so we can prepare a walkthrough that actually matches how you operate — not a generic product tour.",
  },
  {
    Icon: CalendarDays,
    title: "We reach out within 1 business day",
    description:
      "Our team will get in touch to confirm a time. No automated scheduling links — a real person will contact you.",
  },
  {
    Icon: Presentation,
    title: "A focused 30-minute demo",
    description:
      "Live walkthrough built around your industry, team size, and the specific problems you want to solve.",
  },
];

const TRUST_CHIPS = [
  "No commitment required",
  "Built for Indian service businesses",
  "Onboarding support included",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookDemoPage() {
  return (
    <>
      <Navbar />

      <main>
        <div className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-20 right-0 h-[560px] w-[560px] rounded-full bg-brand-100/30 blur-3xl" />
            <div className="absolute bottom-0 -left-20 h-[400px] w-[400px] rounded-full bg-accent-400/10 blur-3xl" />
            <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          </div>

          <Container>
            <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16 xl:gap-24">

              {/* ── Left: pitch column ─────────────────────────────────── */}
              <div className="lg:sticky lg:top-28">
                <Badge className="gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-brand-500"
                    aria-hidden="true"
                  />
                  Book a Demo
                </Badge>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl !leading-[1.1]">
                  See Project X{" "}
                  <span className="text-gradient">in Your Business</span>
                </h1>

                <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                  Tell us about your operation and we will set up a live
                  walkthrough that is actually relevant to how you run your
                  service business — not a scripted product demo.
                </p>

                {/* Process steps */}
                <ol className="mt-10 space-y-7" aria-label="Demo process">
                  {PROCESS_STEPS.map(({ Icon, title, description }, i) => (
                    <li key={title} className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-200/60">
                          <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                        </div>
                        {/* Connecting line */}
                        {i < PROCESS_STEPS.length - 1 && (
                          <div className="absolute left-5 top-10 h-full w-px -translate-x-1/2 bg-brand-100" aria-hidden="true" />
                        )}
                      </div>
                      <div className="pb-7">
                        <p className="text-sm font-semibold text-slate-900">
                          {title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                          {description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Divider + trust note */}
                <div className="border-t border-slate-100 pt-8">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    <strong className="font-semibold text-slate-700">
                      This is a consultative call, not a hard sell.
                    </strong>{" "}
                    If Project X is not the right fit for your business, we will
                    tell you that too.
                  </p>

                  {/* Trust chips */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {TRUST_CHIPS.map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {/* Checkmark */}
                        <svg
                          className="h-3.5 w-3.5 text-green-500 flex-shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right: form column ─────────────────────────────────── */}
              <div>
                <DemoRequestForm />
              </div>
            </div>
          </Container>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </>
  );
}
