import { describe, it, expect } from "vitest";
import { getPasswordStrength } from "@/lib/password-strength";

describe("getPasswordStrength", () => {
  it("returns score 0 for an empty string", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.warning).toBe("");
    expect(result.suggestion).toBe("");
  });

  it("returns a low score for a very common password", () => {
    expect(getPasswordStrength("password").score).toBeLessThanOrEqual(1);
  });

  it("returns a low score for a short numeric string", () => {
    expect(getPasswordStrength("12345678").score).toBeLessThanOrEqual(1);
  });

  it("returns score >= 3 for a strong passphrase", () => {
    expect(getPasswordStrength("correct-horse-battery-staple!").score).toBeGreaterThanOrEqual(3);
  });

  it("returns score 4 for a high-entropy password", () => {
    expect(getPasswordStrength("Tr0ub4dor&3!xyz#$9").score).toBe(4);
  });

  it("returns a non-empty hint for a weak password", () => {
    const result = getPasswordStrength("password123");
    expect(result.score).toBeLessThan(3);
    const hint = result.warning || result.suggestion;
    expect(hint.length).toBeGreaterThan(0);
  });

  it("score is always within 0-4", () => {
    const samples = ["", "a", "abc123", "CorrectHorseBatteryStaple1!", "aaaaaaaaaa"];
    for (const s of samples) {
      const { score } = getPasswordStrength(s);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });
});
