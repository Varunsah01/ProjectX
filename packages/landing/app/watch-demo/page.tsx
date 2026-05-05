import type { Metadata } from "next";
import { Play } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Watch Demo | Project X",
  description:
    "See Project X in action — a short walkthrough of how recurring service businesses manage operations from one platform.",
};

export default function WatchDemoPage() {
  return (
    <>
      <Navbar />

      <main className="pt-28 pb-20 lg:pt-36 lg:pb-28">
        <Container className="max-w-2xl text-center">
          {/* Placeholder video area */}
          <div className="mx-auto flex h-64 w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 sm:h-80">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
                <Play className="h-6 w-6 text-brand-600 ml-0.5" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                Demo video coming soon
              </p>
            </div>
          </div>

          <h1 className="mt-10 text-3xl font-bold text-slate-900 sm:text-4xl">
            See Project X in Action
          </h1>

          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            We are preparing a short walkthrough showing how service businesses
            manage customers, contracts, billing, and technician dispatch from
            one platform. In the meantime, book a live demo tailored to your
            business.
          </p>

          <div className="mt-8">
            <Button variant="primary" size="lg" href="/book-demo">
              Book a Live Demo Instead
            </Button>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
