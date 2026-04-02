"use client";

import { Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  AnimatedSection,
  StaggerContainer,
  AnimatedItem,
} from "@/components/ui/AnimatedSection";
import { TESTIMONIALS } from "@/lib/constants";

export function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand-50/40 blur-3xl -z-10" />

      <Container>
        <AnimatedSection>
          <SectionHeading
            eyebrow="Testimonials"
            title="Trusted by Service Business Owners Across India"
          />
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <AnimatedItem key={testimonial.name}>
              <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-brand-200">
                {/* Star rating */}
                <div className="flex gap-1" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>

                <p className="mt-5 text-slate-600 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="mt-6 flex items-center gap-4 pt-6 border-t border-slate-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white font-semibold text-lg shadow-md shadow-brand-500/20">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {testimonial.role}, {testimonial.company}
                    </div>
                    <div className="text-xs text-slate-400">
                      {testimonial.city}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
