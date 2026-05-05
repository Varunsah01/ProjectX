import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingSection } from "@/components/sections/PricingSection";
import { PRICING_TIERS, PRICING_FAQ_ITEMS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing — Project X AMC & Service Operations Platform",
  description:
    "Transparent pricing for Indian recurring service businesses. Starter from ₹1,999/month. Compare plans, features, and choose what fits your team.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — Project X",
    description: "Starter from ₹1,999/month. Compare plans and features.",
    url: "/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Project X — AMC & Service Operations Platform",
  description:
    "Purpose-built operations platform for Indian recurring service businesses.",
  url: "https://recuring.in/pricing",
  brand: { "@type": "Brand", name: "Project X" },
  offers: PRICING_TIERS.filter((t) => t.monthlyPrice !== null).map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: String(t.monthlyPrice),
    priceCurrency: "INR",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: String(t.monthlyPrice),
      priceCurrency: "INR",
      unitText: "MONTH",
    },
    eligibleQuantity: {
      "@type": "QuantitativeValue",
      maxValue: t.seats,
      unitText: "seats",
    },
    url: "https://recuring.in/pricing",
    availability: "https://schema.org/InStock",
  })),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main id="main-content" className="pt-20 lg:pt-24">
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
