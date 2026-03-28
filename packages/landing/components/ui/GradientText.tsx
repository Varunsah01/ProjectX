import { cn } from "@/lib/cn";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}

export function GradientText({
  children,
  className,
  as: Component = "span",
}: GradientTextProps) {
  return (
    <Component
      className={cn(
        "bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </Component>
  );
}
