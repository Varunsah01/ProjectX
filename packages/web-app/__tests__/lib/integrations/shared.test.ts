import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/query-utils", () => ({
  startOfDay: (d: Date) => d,
  endOfDay: (d: Date) => d,
  toDateString: (d: Date) => d.toISOString().slice(0, 10),
}));

import {
  paiseToRupees,
  toTallyDate,
  toZohoDate,
  escapeXml,
  escapeCsvCell,
  csvRow,
} from "@/lib/integrations/shared";

describe("paiseToRupees", () => {
  it("converts 100 paise to '1.00'", () => {
    expect(paiseToRupees(100)).toBe("1.00");
  });

  it("converts 0 paise to '0.00'", () => {
    expect(paiseToRupees(0)).toBe("0.00");
  });

  it("converts 999 paise to '9.99'", () => {
    expect(paiseToRupees(999)).toBe("9.99");
  });

  it("converts 100050 paise to '1000.50'", () => {
    expect(paiseToRupees(100050)).toBe("1000.50");
  });

  it("converts 1 paisa to '0.01'", () => {
    expect(paiseToRupees(1)).toBe("0.01");
  });
});

describe("toTallyDate", () => {
  it("formats a date as YYYYMMDD", () => {
    expect(toTallyDate(new Date("2026-01-15"))).toBe("20260115");
  });

  it("zero-pads month and day", () => {
    expect(toTallyDate(new Date("2026-03-05"))).toBe("20260305");
  });
});

describe("toZohoDate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toZohoDate(new Date("2026-01-15"))).toBe("2026-01-15");
  });

  it("zero-pads month and day", () => {
    expect(toZohoDate(new Date("2026-03-05"))).toBe("2026-03-05");
  });
});

describe("escapeXml", () => {
  it("escapes ampersand", () => {
    expect(escapeXml("A & B")).toBe("A &amp; B");
  });

  it("escapes angle brackets", () => {
    expect(escapeXml("<tag>")).toBe("&lt;tag&gt;");
  });

  it("escapes quotes", () => {
    expect(escapeXml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes apostrophes", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("handles combined characters", () => {
    expect(escapeXml('A & B <"C">')).toBe("A &amp; B &lt;&quot;C&quot;&gt;");
  });
});

describe("escapeCsvCell", () => {
  it("returns plain text as-is", () => {
    expect(escapeCsvCell("hello")).toBe("hello");
  });

  it("wraps cells containing commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("wraps cells containing quotes and doubles them", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps cells containing newlines", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("csvRow", () => {
  it("joins cells with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("escapes cells that need it", () => {
    expect(csvRow(["plain", "has,comma", "ok"])).toBe('plain,"has,comma",ok');
  });
});
