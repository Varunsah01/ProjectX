"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GradientText } from "@/components/ui/GradientText";

const trustBadges = [
  "GST-compliant billing",
  "Office and field teams",
  "Guided onboarding included",
];

export function HeroSection() {
  const chartRef = useRef(null);
  const isChartInView = useInView(chartRef, { once: true, margin: "-50px" });

  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-brand-100/30 blur-3xl" />
        <div className="absolute top-40 right-0 h-[300px] w-[300px] rounded-full bg-accent-400/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 h-[250px] w-[250px] rounded-full bg-brand-200/15 blur-3xl animate-float-delayed" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      </div>

      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Badge className="gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Indian Service Businesses
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="mt-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-7xl !leading-[1.1]"
          >
            Collect Faster. Serve Better.{" "}
            <GradientText>Renew More Customers.</GradientText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg text-slate-600 sm:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed"
          >
            The all-in-one operations platform for recurring service businesses.
            Stop juggling spreadsheets, WhatsApp groups, and missed payments —
            run your entire service operation from one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              variant="primary"
              size="lg"
              href="/book-demo"
            >
              Book a Demo
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg" href="#features">
              See How It Works
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {trustBadges.map((badge, i) => (
              <motion.div
                key={badge}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-slate-500"
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
                {badge}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard Mockup */}
        <motion.div
          ref={chartRef}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 mx-auto max-w-5xl"
        >
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl shadow-brand-500/10">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded-md bg-slate-100 py-1 px-3">
                <div className="mx-auto w-fit text-[10px] text-slate-400">
                  app.projectx.in/dashboard
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-6 sm:p-8">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {[
                  { label: "Due Collections", value: "\u20b94,28,500", color: "text-red-600", bg: "bg-red-50", delay: 0 },
                  { label: "Open Complaints", value: "23", color: "text-amber-600", bg: "bg-amber-50", delay: 0.1 },
                  { label: "Renewals Due", value: "47", color: "text-brand-600", bg: "bg-brand-50", delay: 0.2 },
                  { label: "Jobs Today", value: "18", color: "text-green-600", bg: "bg-green-50", delay: 0.3 },
                ].map((card) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isChartInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.8 + card.delay }}
                    className={`rounded-xl ${card.bg} p-4 transition-transform hover:scale-[1.02]`}
                  >
                    <div className="text-xs font-medium text-slate-500">{card.label}</div>
                    <div className={`mt-1 text-xl font-bold ${card.color} sm:text-2xl tabular-nums`}>
                      {card.value}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Revenue Chart */}
                <div className="col-span-2 rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Revenue Collected This Month
                  </div>
                  <div className="mt-3 flex items-end gap-1.5 h-[100px]">
                    {[40, 65, 55, 80, 70, 90, 85, 95, 75, 88, 92, 60].map(
                      (h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={isChartInView ? { height: `${h}%` } : {}}
                          transition={{
                            duration: 0.6,
                            delay: 1.0 + i * 0.05,
                            ease: "easeOut",
                          }}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-brand-500 to-accent-400 transition-all hover:from-brand-400 hover:to-accent-300"
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Technician Status */}
                <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Technician Status
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {[
                      { name: "Amit S.", status: "On Job", color: "bg-green-400" },
                      { name: "Ravi K.", status: "En Route", color: "bg-amber-400" },
                      { name: "Suresh M.", status: "Available", color: "bg-blue-400" },
                      { name: "Deepak R.", status: "On Job", color: "bg-green-400" },
                    ].map((tech, i) => (
                      <motion.div
                        key={tech.name}
                        initial={{ opacity: 0, x: 10 }}
                        animate={isChartInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 1.2 + i * 0.1 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-700 font-medium">{tech.name}</span>
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <span
                            className={`h-2 w-2 rounded-full ${tech.color}`}
                          />
                          {tech.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow effect under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-16 w-3/4 bg-brand-500/5 blur-3xl rounded-full" />
        </motion.div>
      </Container>
    </section>
  );
}
