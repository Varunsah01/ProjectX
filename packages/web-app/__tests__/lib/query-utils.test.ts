import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth-utils", () => ({
  getCurrentUser: vi.fn(),
}));

import {
  getActionError,
  actionFailure,
  actionSuccess,
  buildPagination,
  normalizeListParams,
  toDateString,
  toDateTimeString,
  enumToUi,
  startOfDay,
  endOfDay,
  addDays,
  getDaysDifference,
  buildContains,
} from "@/lib/query-utils";

describe("actionFailure", () => {
  it("returns failure result", () => {
    const result = actionFailure("Something broke");
    expect(result).toEqual({ success: false, error: "Something broke" });
  });
});

describe("actionSuccess", () => {
  it("returns success result with data", () => {
    const result = actionSuccess({ id: "123" });
    expect(result).toEqual({ success: true, data: { id: "123" } });
  });

  it("works with null data", () => {
    const result = actionSuccess(null);
    expect(result).toEqual({ success: true, data: null });
  });
});

describe("getActionError", () => {
  it("extracts message from Error", () => {
    expect(getActionError(new Error("DB down"))).toBe("DB down");
  });

  it("returns fallback for non-Error", () => {
    expect(getActionError("string error")).toBe("Something went wrong");
    expect(getActionError(null)).toBe("Something went wrong");
  });

  it("uses custom fallback", () => {
    expect(getActionError(42, "Custom fallback")).toBe("Custom fallback");
  });
});

describe("buildPagination", () => {
  it("calculates pagination correctly", () => {
    const result = buildPagination(["a", "b", "c"], 25, 1, 10);
    expect(result).toEqual({
      data: ["a", "b", "c"],
      total: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    });
  });

  it("returns at least 1 total page", () => {
    const result = buildPagination([], 0, 1, 10);
    expect(result.totalPages).toBe(1);
  });
});

describe("normalizeListParams", () => {
  it("returns defaults for empty params", () => {
    const result = normalizeListParams();
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.sortOrder).toBe("desc");
    expect(result.skip).toBe(0);
    expect(result.take).toBe(50);
  });

  it("clamps page to minimum 1", () => {
    const result = normalizeListParams({ page: -5 });
    expect(result.page).toBe(1);
  });

  it("clamps pageSize between 1 and 100", () => {
    expect(normalizeListParams({ pageSize: 0 }).pageSize).toBe(1);
    expect(normalizeListParams({ pageSize: 200 }).pageSize).toBe(100);
  });

  it("calculates skip correctly", () => {
    const result = normalizeListParams({ page: 3, pageSize: 10 });
    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
  });

  it("trims search and status", () => {
    const result = normalizeListParams({ search: "  hello  ", status: " ACTIVE " });
    expect(result.search).toBe("hello");
    expect(result.status).toBe("ACTIVE");
  });
});

describe("toDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(toDateString(new Date("2025-06-15T14:30:00Z"))).toBe("2025-06-15");
  });

  it("returns empty string for null/undefined", () => {
    expect(toDateString(null)).toBe("");
    expect(toDateString(undefined)).toBe("");
  });
});

describe("toDateTimeString", () => {
  it("returns ISO string", () => {
    const d = new Date("2025-06-15T14:30:00.000Z");
    expect(toDateTimeString(d)).toBe("2025-06-15T14:30:00.000Z");
  });

  it("returns empty string for null/undefined", () => {
    expect(toDateTimeString(null)).toBe("");
  });
});

describe("enumToUi", () => {
  it("lowercases enum values", () => {
    expect(enumToUi("ACTIVE")).toBe("active");
    expect(enumToUi("IN_PROGRESS")).toBe("in_progress");
  });
});

describe("date helpers", () => {
  it("startOfDay zeros time", () => {
    const d = startOfDay(new Date("2025-06-15T23:59:59.999Z"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("endOfDay sets to 23:59:59.999", () => {
    const d = endOfDay(new Date("2025-06-15T00:00:00Z"));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });

  it("addDays adds days", () => {
    const d = addDays(new Date("2025-01-30"), 5);
    expect(d.getDate()).toBe(4);
    expect(d.getMonth()).toBe(1); // Feb
  });

  it("getDaysDifference returns correct diff", () => {
    const from = new Date("2025-01-01");
    const to = new Date("2025-01-11");
    expect(getDaysDifference(from, to)).toBe(10);
  });
});

describe("buildContains", () => {
  it("returns Prisma contains filter", () => {
    expect(buildContains("search term")).toEqual({
      contains: "search term",
      mode: "insensitive",
    });
  });
});
