"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

export function CTASection() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-8 py-16 text-center sm:px-16 lg:py-24">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />

            {/* Floating orbs */}
            <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-white/5 blur-2xl animate-float" />
            <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl animate-float-delayed" />
            <div className="absolute top-1/2 left-1/4 h-20 w-20 rounded-full bg-accent-400/10 blur-xl animate-pulse-slow" />
            <div className="absolute bottom-1/3 right-1/4 h-24 w-24 rounded-full bg-brand-300/10 blur-xl animate-pulse-slow" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm mb-8">
                <Sparkles className="h-4 w-4" />
                Tailored walkthrough · Guided onboarding · Built for your workflow
              </div>

              <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl !leading-tight">
                See How Project X Fits
                <br />
                Your Service Business
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100/90 leading-relaxed">
                Book a demo and we will walk you through the platform using your
                real business context — your industry, team size, and the
                specific problems you want to solve. No pressure, no pitch.
                Pricing comes after we understand your requirements.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button
                  variant="white"
                  size="lg"
                  href="/book-demo"
                >
                  Book a Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  href="mailto:hello@projectx.in"
                  className="text-white/90 hover:text-white hover:bg-white/10"
                >
                  Talk to Us
                </Button>
              </div>
              <p className="mt-8 text-sm text-brand-200/70">
                Our team handles setup end-to-end — your team is operational within 1–2 weeks.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
