"use client";

import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SOCIAL_PROOF_STATS } from "@/lib/constants";

function CountUpStat({
  target,
  suffix,
  delay,
}: {
  target: number;
  suffix: string;
  delay: number;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(spanRef, { once: true, margin: "-30px" });

  useEffect(() => {
    if (!isInView || !spanRef.current) return;

    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const duration = 1200;

      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(eased * target);
        if (spanRef.current) spanRef.current.textContent = `${value}${suffix}`;
        if (progress < 1) requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [isInView, target, suffix, delay]);

  return (
    <span ref={spanRef} className="tabular-nums">
      0{suffix}
    </span>
  );
}

export function SocialProofBar() {
  return (
    <section className="py-8 lg:py-12 border-b border-slate-100">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8"
        >
          {SOCIAL_PROOF_STATS.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
                <CountUpStat
                  target={stat.numericValue}
                  suffix={stat.suffix}
                  delay={i * 0.15}
                />
              </div>
              <div className="mt-1 text-sm text-slate-500 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
