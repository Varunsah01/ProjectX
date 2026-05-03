import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { SocialProofBar } from "@/components/sections/SocialProofBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { INLINE_CTA_CONTENT } from "@/lib/constants";

const ProblemSection = dynamic(
  () => import("@/components/sections/ProblemSection").then((m) => ({ default: m.ProblemSection })),
  { ssr: true }
);
const SolutionSection = dynamic(
  () => import("@/components/sections/SolutionSection").then((m) => ({ default: m.SolutionSection })),
  { ssr: true }
);
const FeaturesSection = dynamic(
  () => import("@/components/sections/FeaturesSection").then((m) => ({ default: m.FeaturesSection })),
  { ssr: true }
);
const InlineCTA = dynamic(
  () => import("@/components/ui/InlineCTA").then((m) => ({ default: m.InlineCTA })),
  { ssr: true }
);
const IndustriesSection = dynamic(
  () => import("@/components/sections/IndustriesSection").then((m) => ({ default: m.IndustriesSection })),
  { ssr: true }
);
const HowItHelpsSection = dynamic(
  () => import("@/components/sections/HowItHelpsSection").then((m) => ({ default: m.HowItHelpsSection })),
  { ssr: true }
);
const WhyUsSection = dynamic(
  () => import("@/components/sections/WhyUsSection").then((m) => ({ default: m.WhyUsSection })),
  { ssr: true }
);
const TestimonialsSection = dynamic(
  () => import("@/components/sections/TestimonialsSection").then((m) => ({ default: m.TestimonialsSection })),
  { ssr: true }
);
const FAQSection = dynamic(
  () => import("@/components/sections/FAQSection").then((m) => ({ default: m.FAQSection })),
  { ssr: true }
);
const CTASection = dynamic(
  () => import("@/components/sections/CTASection").then((m) => ({ default: m.CTASection })),
  { ssr: true }
);

export const metadata: Metadata = {
  title: "Project X — AMC & Service Operations Platform for India",
  description:
    "Manage AMC contracts, automate recurring billing, dispatch technicians, and collect faster. Purpose-built for Indian field service businesses.",
  openGraph: {
    title: "Project X — AMC & Service Operations Platform for India",
    description:
      "Manage AMC contracts, automate recurring billing, dispatch technicians, and collect faster. Purpose-built for Indian field service businesses.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://recuring.in",
  },
};

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <SocialProofBar />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <InlineCTA {...INLINE_CTA_CONTENT.afterFeatures} />
        <IndustriesSection />
        <HowItHelpsSection />
        <WhyUsSection />
        <TestimonialsSection />
        <InlineCTA {...INLINE_CTA_CONTENT.afterTestimonials} />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
