import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
        hover &&
          "transition-all duration-300 hover:shadow-md hover:-translate-y-1",
        className
      )}
    >
      {children}
    </div>
  );
}
