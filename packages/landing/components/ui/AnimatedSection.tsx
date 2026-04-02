"use client";

import { type Variants, type Variant, motion } from "framer-motion";
import { cn } from "@/lib/cn";

type AnimationVariant = "fade-up" | "fade-in" | "scale" | "slide-left" | "slide-right";

const ANIMATION_VARIANTS: Record<AnimationVariant, { hidden: Variant; visible: (delay: number) => Variant }> = {
  "fade-up": {
    hidden: { opacity: 0, y: 30 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut", delay },
    }),
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: (delay: number) => ({
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut", delay },
    }),
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: (delay: number) => ({
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut", delay },
    }),
  },
  "slide-left": {
    hidden: { opacity: 0, x: -40 },
    visible: (delay: number) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: "easeOut", delay },
    }),
  },
  "slide-right": {
    hidden: { opacity: 0, x: 40 },
    visible: (delay: number) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: "easeOut", delay },
    }),
  },
};

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  variant?: AnimationVariant;
}

export function AnimatedSection({
  children,
  className,
  variants,
  delay = 0,
  variant = "fade-up",
}: AnimatedSectionProps) {
  const preset = ANIMATION_VARIANTS[variant];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={
        variants || {
          hidden: preset.hidden,
          visible: preset.visible(delay),
        }
      }
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
