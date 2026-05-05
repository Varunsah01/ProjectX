"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, ChevronDown, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { PRICING_TIERS, PRICING_FAQ_ITEMS } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tier = (typeof PRICING_TIERS)[number];

// ─── Comparison table data ────────────────────────────────────────────────

const COMPARISON_ROWS: {
  category: string;
  rows: { label: string; starter: string | boolean; growth: string | boolean; scale: string | boolean }[];
}[] = [
  {
    category: "Limits",
    rows: [
      { label: "Office seats", starter: "3 seats", growth: "10 seats", scale: "Unlimited" },
      { label: "Active customers", starter: "Up to 100", growth: "Up to 1,000", scale: "Unlimited" },
      { label: "Locations / branches", starter: "1", growth: "Unlimited", scale: "Unlimited" },
    ],
  },
  {
    category: "Core Features",
    rows: [
      { label: "Customer Management", starter: true, growth: true, scale: true },
      { label: "Asset Tracking", starter: true, growth: true, scale: true },
      { label: "Recurring Billing & GST Invoices", starter: true, growth: true, scale: true },
      { label: "Collections & Payment Reminders", starter: true, growth: true, scale: true },
      { label: "Complaint Management", starter: true, growth: true, scale: true },
      { label: "AMC & Contract Management", starter: true, growth: true, scale: true },
      { label: "Email & WhatsApp Reminders", starter: true, growth: true, scale: true },
    ],
  },
  {
    category: "Field Operations",
    rows: [
      { label: "Technician Mobile App", starter: false, growth: true, scale: true },
      { label: "GPS Job Tracking", starter: false, growth: true, scale: true },
      { label: "Proof of Service (photos + signature)", starter: false, growth: true, scale: true },
    ],
  },
  {
    category: "Growth",
    rows: [
      { label: "Customer Self-Service Portal", starter: false, growth: true, scale: true },
      { label: "Advanced Reports & Analytics", starter: false, growth: true, scale: true },
      { label: "Priority Support", starter: false, growth: true, scale: true },
    ],
  },
  {
    category: "Enterprise",
    rows: [
      { label: "API Access & Webhooks", starter: false, growth: false, scale: true },
      { label: "Dedicated Customer Success Manager", starter: false, growth: false, scale: true },
      { label: "Custom SLA & Uptime Guarantee", starter: false, growth: false, scale: true },
      { label: "White-label Customer Portal", starter: false, growth: false, scale: true },
      { label: "Custom Integrations", starter: false, growth: false, scale: true },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function BillingToggle({
  isAnnual,
  onToggle,
}: {
  isAnnual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-12">
      <span className={`text-sm font-medium ${!isAnnual ? "text-slate-900" : "text-slate-500"}`}>
        Monthly
      </span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isAnnual}
        className="relative h-6 w-12 rounded-full bg-slate-200 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        style={{ backgroundColor: isAnnual ? "rgb(99 102 241)" : undefined }}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: isAnnual ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      <span className={`text-sm font-medium ${isAnnual ? "text-slate-900" : "text-slate-500"}`}>
        Annual
      </span>
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Save 20%
      </span>
    </div>
  );
}

function PriceDisplay({ tier, isAnnual }: { tier: Tier; isAnnual: boolean }) {
  if (tier.monthlyPrice === null) {
    return (
      <div className="mt-6 mb-2">
        <span className="text-4xl font-bold text-slate-900">Custom</span>
        <p className="mt-1 text-sm text-slate-500">Tailored to your team size</p>
      </div>
    );
  }

  const displayPrice = isAnnual ? tier.annualPrice : tier.monthlyPrice;

  return (
    <div className="mt-6 mb-2">
      <div className="flex items-end gap-1">
        <span className="text-sm font-medium text-slate-500 mb-1.5">₹</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={isAnnual ? "annual" : "monthly"}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="text-4xl font-bold text-slate-900 tabular-nums"
          >
            {displayPrice?.toLocaleString("en-IN")}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm text-slate-500 mb-1.5">/mo</span>
      </div>
      {isAnnual && tier.annualTotal !== null ? (
        <p className="mt-1 text-sm text-slate-500">
          Billed ₹{tier.annualTotal.toLocaleString("en-IN")}/year
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Billed monthly</p>
      )}
    </div>
  );
}

function TierCard({ tier, isAnnual }: { tier: Tier; isAnnual: boolean }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 ${
        tier.highlight
          ? "bg-white ring-2 ring-brand-500 shadow-xl shadow-brand-500/10"
          : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-gradient-to-r from-brand-600 to-accent-500 px-4 py-1 text-xs font-semibold text-white shadow-md">
            Most Popular
          </span>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{tier.tagline}</p>
        <PriceDisplay tier={tier} isAnnual={isAnnual} />

        {/* Limits chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {tier.seats !== null ? `${tier.seats} seats` : "Unlimited seats"}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {tier.customerLimit !== null
              ? `${tier.customerLimit.toLocaleString("en-IN")} customers`
              : "Unlimited customers"}
          </span>
        </div>
      </div>

      <ul className="mt-8 flex flex-col gap-3 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            <span className="text-sm text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          variant={tier.highlight ? "primary" : tier.monthlyPrice === null ? "outline" : "outline"}
          size="md"
          href={tier.cta.href}
          className="w-full justify-center"
        >
          {tier.cta.label}
          {tier.highlight && (
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">
          {tier.monthlyPrice !== null ? "No credit card required" : "Pricing after a short call"}
        </p>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-5 w-5 text-brand-500" aria-label="Included" />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="Not included" />
    );
  }
  return <span className="text-sm font-medium text-slate-700">{value}</span>;
}

function ComparisonTable() {
  return (
    <div className="mt-20 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="w-1/2 py-4 pr-6 text-sm font-semibold text-slate-900">
              Feature
            </th>
            {PRICING_TIERS.map((tier) => (
              <th
                key={tier.id}
                className={`w-[16.66%] py-4 px-4 text-center text-sm font-bold ${
                  tier.highlight ? "text-brand-600" : "text-slate-900"
                }`}
              >
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((group) => (
            <>
              <tr key={group.category}>
                <td
                  colSpan={4}
                  className="pt-6 pb-2 text-xs font-semibold uppercase tracking-widest text-brand-600"
                >
                  {group.category}
                </td>
              </tr>
              {group.rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={i % 2 === 0 ? "bg-slate-50/50" : "bg-white"}
                >
                  <td className="rounded-l-lg py-3 pr-6 text-sm text-slate-600">{row.label}</td>
                  <td className="py-3 px-4 text-center">
                    <CellValue value={row.starter} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CellValue value={row.growth} />
                  </td>
                  <td className="rounded-r-lg py-3 px-4 text-center">
                    <CellValue value={row.scale} />
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-slate-900 pr-8 group-hover:text-brand-600 transition-colors">
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="shrink-0 rounded-full bg-slate-100 p-1 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors"
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-slate-500 leading-relaxed pr-12">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="py-20 lg:py-28 bg-white">
        <Container>
          <AnimatedSection>
            <SectionHeading
              eyebrow="Pricing"
              title="Simple, transparent pricing"
              subtitle="Start free. Upgrade as you grow. No hidden fees, no surprises."
            />
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <BillingToggle isAnnual={isAnnual} onToggle={() => setIsAnnual((v) => !v)} />
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="grid gap-8 lg:grid-cols-3 items-start">
              {PRICING_TIERS.map((tier) => (
                <TierCard key={tier.id} tier={tier} isAnnual={isAnnual} />
              ))}
            </div>
          </AnimatedSection>

          {/* Comparison table */}
          <AnimatedSection delay={0.2}>
            <div className="mt-16">
              <h3 className="text-center text-xl font-bold text-slate-900 mb-2">
                Compare plans in detail
              </h3>
              <p className="text-center text-sm text-slate-500 mb-2">
                Every feature, side by side.
              </p>
              <ComparisonTable />
            </div>
          </AnimatedSection>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-50 lg:py-28">
        <Container className="max-w-3xl">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Billing FAQ"
              title="Common billing questions"
              subtitle="Everything you need to know before signing up."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div className="rounded-2xl border border-slate-200 bg-white px-6 sm:px-8 shadow-sm">
              {PRICING_FAQ_ITEMS.map((item, i) => (
                <FAQItem key={item.question} question={item.question} answer={item.answer} index={i} />
              ))}
            </div>
          </AnimatedSection>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-white">
        <Container>
          <AnimatedSection variant="scale">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-8 py-14 text-center sm:px-16">
              <div className="absolute inset-0 bg-grid-pattern opacity-10" />
              <div className="absolute top-8 left-8 h-28 w-28 rounded-full bg-white/5 blur-2xl animate-float" />
              <div className="absolute bottom-8 right-8 h-36 w-36 rounded-full bg-white/5 blur-2xl animate-float-delayed" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Still not sure which plan fits?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100/90">
                  Book a 30-minute demo. We will walk you through the platform using your
                  real business context and recommend the right plan — no pitch, no pressure.
                </p>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Button variant="white" size="lg" href="/book-demo">
                    Book a Demo
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    href="/book-demo?intent=talk"
                    className="text-white border-2 border-white/30 hover:text-white hover:bg-white/10 hover:border-white/50"
                  >
                    Talk to Us
                  </Button>
                </div>
                <p className="mt-6 text-sm text-brand-200/70">
                  14-day free trial · No credit card required · Setup handled by our team
                </p>
              </div>
            </div>
          </AnimatedSection>
        </Container>
      </section>
    </>
  );
}
