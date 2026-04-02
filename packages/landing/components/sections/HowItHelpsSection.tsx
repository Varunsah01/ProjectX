"use client";

import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GradientText } from "@/components/ui/GradientText";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { VALUE_PILLARS } from "@/lib/constants";

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(spanRef, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView || !spanRef.current) return;

    const startTime = performance.now();
    const duration = 1500;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const value = Math.floor(eased * target);
      if (spanRef.current) spanRef.current.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [isInView, target, suffix]);

  return (
    <span ref={spanRef} className="tabular-nums">
      0{suffix}
    </span>
  );
}

export function HowItHelpsSection() {
  const metricsData = [
    { target: 2, suffix: "x", metric: "2x" },
    { target: 90, suffix: "%", metric: "90%" },
    { target: 40, suffix: "%", metric: "40%" },
  ];

  return (
    <section className="py-20 bg-slate-50 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 -z-10" />

      <Container>
        <AnimatedSection variant="fade-in">
          <SectionHeading
            eyebrow="Impact"
            title="Real Results for Real Businesses"
            subtitle="Project X customers report dramatic, measurable improvements across their operations."
          />
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {VALUE_PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
            >
              <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 to-accent-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                {/* Background glow on hover */}
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-brand-100/0 group-hover:bg-brand-100/40 blur-3xl transition-all duration-500" />

                <div className="relative">
                  <GradientText className="text-5xl font-bold lg:text-6xl block">
                    <CountUp
                      target={metricsData[i].target}
                      suffix={metricsData[i].suffix}
                    />
                  </GradientText>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-slate-500 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
