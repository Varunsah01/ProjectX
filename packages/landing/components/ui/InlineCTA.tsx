"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

interface InlineCTAProps {
  text: string;
  buttonText: string;
  buttonHref: string;
}

export function InlineCTA({ text, buttonText, buttonHref }: InlineCTAProps) {
  return (
    <section className="py-10 lg:py-14">
      <Container>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 px-8 py-10 sm:px-12 lg:py-12"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />

          {/* Floating accent */}
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left sm:justify-between">
            <p className="text-lg font-semibold text-white sm:text-xl max-w-xl">
              {text}
            </p>
            <Button
              variant="white"
              size="md"
              href={buttonHref}
              className="shrink-0"
            >
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
