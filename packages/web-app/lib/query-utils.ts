import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-utils";
import type { ActionFailure, ActionResult, ListParams, PaginatedData } from "@/lib/types";

export async function getOrganizationContext() {
  const user = await getCurrentUser();

  if (!user?.organizationId) {
    throw new Error("Unauthorized");
  }

  return user;
}

export function getActionError(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function actionFailure(message: string): ActionFailure {
  return {
    success: false,
    error: message,
  };
}

export function actionSuccess<T>(data: T): ActionResult<T> {
  return {
    success: true,
    data,
  };
}

export function buildPagination<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedData<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function normalizeListParams(params: ListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const sortOrder: "asc" | "desc" = params.sortOrder === "asc" ? "asc" : "desc";

  return {
    search: params.search?.trim() ?? "",
    status: params.status?.trim() ?? "",
    type: params.type?.trim() ?? "",
    category: params.category?.trim() ?? "",
    sortBy: params.sortBy?.trim() ?? "createdAt",
    sortOrder,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function toDateString(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function toDateTimeString(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }

  return date.toISOString();
}

export function enumToUi<T extends string>(value: T): Lowercase<T> {
  return value.toLowerCase() as Lowercase<T>;
}

export function roleToUi(value: string) {
  return value.toLowerCase() as Lowercase<typeof value>;
}

export function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "short",
  });
}

export function getMonthLabelWithYear(date: Date) {
  const label = date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });

  return label.replace(" ", " '");
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getDaysDifference(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function buildContains(value: string) {
  return {
    contains: value,
    mode: "insensitive" as const,
  };
}

export function safelyParseJson<T>(value: Prisma.JsonValue, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  return value as T;
}

export function toEnumValue<T extends string>(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.toUpperCase().replaceAll(" ", "_") as T;
}
