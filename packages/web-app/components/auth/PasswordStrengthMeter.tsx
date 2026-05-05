"use client";

import { useMemo } from "react";
import { getPasswordStrength } from "@/lib/password-strength";

const FILLED_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-green-500",
};

const LABELS: Record<number, string> = {
  0: "",
  1: "Very weak",
  2: "Weak",
  3: "Fair",
  4: "Strong",
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, warning, suggestion } = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const filledColor = password
    ? (FILLED_COLORS[score] ?? "bg-slate-200")
    : "bg-slate-200";
  const hint = warning || suggestion;

  return (
    // Always rendered with fixed structure so there is no layout jump
    <div className="mt-2 space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              password && i < score ? filledColor : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="min-h-[1rem] text-xs text-slate-500">
        {password ? (
          <>
            <span className="sr-only">Password strength: </span>
            {LABELS[score]}
            {hint ? ` — ${hint}` : ""}
          </>
        ) : null}
      </p>
    </div>
  );
}
