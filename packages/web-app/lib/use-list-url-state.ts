"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildSearchParamsString } from "@/lib/url-search-params";

export function useListUrlState(
  defaults: Record<string, string | number | undefined>,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(
    updates: Record<string, string | number | null | undefined>,
  ) {
    const queryString = buildSearchParamsString(searchParams, updates, defaults);
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return {
    searchParams,
    updateParams,
  };
}
