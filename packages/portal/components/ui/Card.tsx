import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 text-left",
        onClick && "cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all",
        className,
      )}
    >
      {children}
    </Component>
  );
}
