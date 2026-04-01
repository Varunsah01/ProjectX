"use client";

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GradientText } from "@/components/ui/GradientText";
import {
  AnimatedSection,
  StaggerContainer,
  AnimatedItem,
} from "@/components/ui/AnimatedSection";
import { SOLUTION_POINTS } from "@/lib/constants";

export function SolutionSection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-100/20 blur-3xl -z-10" />

      <Container>
        <AnimatedSection>
          <SectionHeading
            eyebrow="The Solution"
            title="One Platform. Everything Connected."
            subtitle="Project X brings your customers, payments, complaints, technicians, and contracts into a single system that your whole team can use — from the office to the field."
          />
        </AnimatedSection>

        <StaggerContainer className="relative grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[17%] right-[17%] h-[2px] bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 z-0" />

          {SOLUTION_POINTS.map((point, i) => (
            <AnimatedItem key={point.title}>
              <div className="relative text-center">
                {/* Step number */}
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand-500/25 transition-transform hover:scale-105">
                  <point.icon className="h-8 w-8" />
                </div>
                <div className="mx-auto mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">
                  {point.title}
                </h3>
                <p className="mt-3 text-slate-500 leading-relaxed">
                  {point.description}
                </p>
              </div>
            </AnimatedItem>
          ))}
        </StaggerContainer>

        {/* Automated flow diagram */}
        <AnimatedSection delay={0.3}>
          <div className="mt-16 relative rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-8 overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30" />

            <div className="relative">
              {/* Flow steps */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                {[
                  { text: "Customer raises a complaint", highlight: true },
                  { text: "Technician gets assigned automatically", highlight: false },
                  { text: "Job completed with proof", highlight: false },
                  { text: "Invoice generated", highlight: true },
                  { text: "Payment reminder sent", highlight: false },
                  { text: "You get paid", highlight: true },
                ].map((step, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        step.highlight
                          ? "bg-gradient-brand text-white shadow-md shadow-brand-500/20"
                          : "bg-white text-slate-700 border border-slate-200 shadow-sm"
                      }`}
                    >
                      {step.text}
                    </span>
                    {i < 5 && (
                      <svg className="h-4 w-4 text-brand-300 shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-slate-500">
                All of this happens inside one platform. No spreadsheets. No
                WhatsApp. No manual tracking.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
