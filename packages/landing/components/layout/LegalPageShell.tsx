import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageShell({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalPageShellProps) {
  return (
    <>
      <Navbar />

      <main>
        {/* Page Header */}
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-brand-50/60 to-white pt-32 pb-14">
          {/* Decorative blobs */}
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-accent-100/40 blur-3xl" />

          <Container className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-600 ring-1 ring-inset ring-brand-200/60 shadow-sm mb-6">
              Legal
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              {subtitle}
            </p>
            <p className="mt-5 text-sm text-slate-400">
              Last updated:{" "}
              <time className="font-medium text-slate-500">{lastUpdated}</time>
            </p>
          </Container>
        </div>

        {/* Content */}
        <div className="py-16 sm:py-20">
          <Container className="max-w-3xl">
            <div className="prose-legal">{children}</div>
          </Container>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </>
  );
}

/*
  Usage:
  <LegalPageShell
    title="Privacy Policy"
    subtitle="..."
    lastUpdated="1 April 2026"
  >
    ...sections...
  </LegalPageShell>
*/
