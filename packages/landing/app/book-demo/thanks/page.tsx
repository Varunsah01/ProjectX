import type { Metadata } from "next";
import { CheckCircle, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Demo Request Received | Project X",
  description: "Thank you for requesting a demo. Our team will be in touch within 1 business day.",
  robots: { index: false, follow: false },
};

// ─── Cal.com embed (rendered only when CAL_LINK is set) ───────────────────────

function CalEmbed({ calLink }: { calLink: string }) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          Or pick a time that works for you
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Skip the back-and-forth — book directly below.
        </p>
      </div>
      <iframe
        src={`https://cal.com/${calLink}?embed=true&hideEventTypeDetails=false&layout=month_view`}
        width="100%"
        height="700"
        frameBorder="0"
        title="Schedule a demo call"
        className="block"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookDemoThanksPage({
  searchParams,
}: {
  searchParams: { name?: string; email?: string };
}) {
  const name = searchParams.name ?? "there";
  const email = searchParams.email;
  const calLink = process.env.CAL_LINK;

  return (
    <>
      <Navbar />

      <main>
        <div className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-20 right-0 h-[560px] w-[560px] rounded-full bg-brand-100/30 blur-3xl" />
            <div className="absolute bottom-0 -left-20 h-[400px] w-[400px] rounded-full bg-green-400/10 blur-3xl" />
          </div>

          <Container className="max-w-2xl">
            {/* Confirmation card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
              </div>

              <h1 className="mt-6 text-3xl font-bold text-slate-900">
                Demo Request Received
              </h1>

              <p className="mt-3 text-lg text-slate-600 leading-relaxed">
                Thanks,{" "}
                <strong className="font-semibold text-slate-800">{name}</strong>.
                We have received your details and will be in touch shortly.
              </p>

              {email && (
                <p className="mt-2 text-sm text-slate-400">
                  A confirmation has been sent to{" "}
                  <span className="font-medium text-slate-500">{email}</span>.
                </p>
              )}

              {/* What happens next */}
              <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-6 text-left">
                <h2 className="text-sm font-semibold text-slate-700">What happens next</h2>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                    <span className="text-sm text-slate-600">
                      Our team will review your details and reach out within{" "}
                      <strong className="font-semibold text-slate-800">1 business day</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                    <span className="text-sm text-slate-600">
                      We will confirm a 30-minute slot for a live walkthrough tailored to your
                      industry and workflows.
                    </span>
                  </li>
                </ul>
              </div>

              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                ← Back to homepage
              </Link>
            </div>

            {/* Cal.com embed — only rendered when CAL_LINK env var is set */}
            {calLink && <CalEmbed calLink={calLink} />}
          </Container>
        </div>
      </main>

      <Footer />
    </>
  );
}
