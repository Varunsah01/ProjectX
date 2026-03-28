"use client";

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  AnimatedSection,
  StaggerContainer,
  AnimatedItem,
} from "@/components/ui/AnimatedSection";
import { PAIN_POINTS } from "@/lib/constants";

export function ProblemSection() {
  return (
    <section className="py-20 bg-slate-50 lg:py-28 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-red-100/30 blur-3xl -z-10" />

      <Container>
        <AnimatedSection>
          <SectionHeading
            eyebrow="The Problem"
            title="Sound Familiar?"
            subtitle="If you run a recurring service business in India, you probably deal with this every single day."
          />
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PAIN_POINTS.map((point, i) => (
            <AnimatedItem key={point.title}>
              <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                {/* Gradient accent on hover */}
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-400 to-orange-400 opacity-60 transition-opacity group-hover:opacity-100" />

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors group-hover:bg-red-100">
                    <point.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 tabular-nums mt-1">
                    0{i + 1}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900 leading-snug">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {point.description}
                </p>
              </div>
            </AnimatedItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
