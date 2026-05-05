"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, CheckCircle, Sparkles, Play } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GradientText } from "@/components/ui/GradientText";

const trustBadges = [
  "GST-compliant billing",
  "Office and field teams",
  "Guided onboarding included",
];

const customerLogos = [
  "KoolBreeze AC Services",
  "PureFlow Water Solutions",
  "SecureVision CCTV Services",
];

function FloatingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="absolute -right-4 top-1/3 z-10 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:-right-6 lg:-right-8 max-w-[220px] hidden sm:block"
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-medium text-slate-500">Just resolved</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-800">
        Complaint #1024
      </p>
      <p className="text-xs text-slate-500">
        Resolved in 2 hours
      </p>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-shift animate-gradient-shift opacity-100" />
        <div className="absolute top-40 right-0 h-[300px] w-[300px] rounded-full bg-accent-400/10 blur-3xl will-change-transform animate-float" />
        <div className="absolute bottom-0 left-0 h-[250px] w-[250px] rounded-full bg-brand-200/15 blur-3xl will-change-transform animate-float-delayed" />
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
            className="mt-8 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-7xl !leading-[1.1]"
          >
            Collect Faster. Serve Better.{" "}
            <GradientText>Renew More Customers.</GradientText>
          </motion.h1>

          {/* Outcome-led sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg text-slate-700 sm:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Recurring service businesses cut payment delays by 50% and recover
            40% more renewals in 60 days.
          </motion.p>

          {/* Extended description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="mt-4 text-base text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            Customers, billing, complaints, technicians, contracts — managed
            from one platform, by your whole team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button variant="primary" size="lg" href="/book-demo">
              Book a Demo
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg" href="/watch-demo">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Trust badges */}
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

          {/* Customer logo strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Trusted by
            </span>
            {customerLogos.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold text-slate-300"
              >
                {name}
              </span>
            ))}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              + more
            </span>
          </motion.div>
        </div>

        {/* Dashboard Screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-16 mx-auto max-w-5xl"
        >
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl shadow-brand-500/10 overflow-hidden">
            {/* Browser chrome */}
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

            {/* Real screenshot */}
            <Image
              src="/hero-dashboard-light.png"
              alt="Project X dashboard showing real-time metrics, revenue chart, and action items for a recurring service business"
              width={2880}
              height={1800}
              priority
              className="rounded-xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1024px"
            />
          </div>

          {/* Floating notification card */}
          <FloatingCard />

          {/* Glow effect under screenshot */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-16 w-3/4 bg-brand-500/5 blur-3xl rounded-full" />
        </motion.div>
      </Container>
    </section>
  );
}
