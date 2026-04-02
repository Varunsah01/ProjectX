"use client";

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  AnimatedSection,
  StaggerContainer,
  AnimatedItem,
} from "@/components/ui/AnimatedSection";
import { INDUSTRIES } from "@/lib/constants";

export function IndustriesSection() {
  return (
    <section id="industries" className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-brand-100/20 blur-3xl -z-10" />

      <Container>
        <AnimatedSection variant="fade-in">
          <SectionHeading
            eyebrow="Industries"
            title="Purpose-Built for Every Recurring Service Vertical"
            subtitle="Whether you service 50 customers or 5,000 — if you do recurring service work, Project X is made for you."
          />
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {INDUSTRIES.map((industry) => (
            <AnimatedItem key={industry.name}>
              <div className="group rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 gradient-border">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:bg-gradient-brand group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-500/20 group-hover:scale-110">
                  <industry.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {industry.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {industry.tagline}
                </p>
              </div>
            </AnimatedItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
