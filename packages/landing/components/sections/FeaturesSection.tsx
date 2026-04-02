"use client";

import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  AnimatedSection,
  StaggerContainer,
  AnimatedItem,
} from "@/components/ui/AnimatedSection";
import { FEATURES } from "@/lib/constants";

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-slate-50 lg:py-28 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-brand-100/20 blur-3xl -z-10" />

      <Container>
        <AnimatedSection>
          <SectionHeading
            eyebrow="Platform Modules"
            title="Everything You Need to Run Your Service Business"
            subtitle="Deep, purpose-built modules for every part of your operation — not a generic CRM with bolt-ons."
          />
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <AnimatedItem key={feature.title}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-brand-200 relative overflow-hidden gradient-border">
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-50/0 to-accent-50/0 group-hover:from-brand-50/50 group-hover:to-accent-50/30 transition-all duration-500 -z-0" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:bg-gradient-brand group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-500/25 group-hover:scale-110">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </AnimatedItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
