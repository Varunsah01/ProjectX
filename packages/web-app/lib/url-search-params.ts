export const DEFAULT_PAGE_SIZE = 20;

type SearchParamRecord = Record<string, string | string[] | undefined>;
type SearchParamReader = {
  get: (key: string) => string | null;
};

export function readSearchParam(
  source: SearchParamRecord | SearchParamReader,
  key: string,
  fallback = "",
) {
  if ("get" in source && typeof source.get === "function") {
    return source.get(key) ?? fallback;
  }

  const value = (source as SearchParamRecord)[key];

  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export function readNumberSearchParam(
  source: SearchParamRecord | SearchParamReader,
  key: string,
  fallback: number,
  min = 1,
) {
  const value = Number.parseInt(readSearchParam(source, key, ""), 10);

  if (Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(min, value);
}

export function buildSearchParamsString(
  current: { toString: () => string },
  updates: Record<string, string | number | null | undefined>,
  defaults: Record<string, string | number | undefined> = {},
) {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    const defaultValue = defaults[key];

    if (
      value == null ||
      value === "" ||
      (defaultValue !== undefined && String(value) === String(defaultValue))
    ) {
      next.delete(key);
      continue;
    }

    next.set(key, String(value));
  }

  return next.toString();
}
