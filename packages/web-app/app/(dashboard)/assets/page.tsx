import { getAssetCategories, listAssets } from "@/lib/queries/assets";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import AssetsPageClient from "./page-client";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = {
    search: readSearchParam(searchParams, "search"),
    category: readSearchParam(searchParams, "category", "all"),
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };
  const [assets, categories] = await Promise.all([
    listAssets({
      search: params.search || undefined,
      category: params.category !== "all" ? params.category : undefined,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    getAssetCategories(),
  ]);

  return <AssetsPageClient assets={assets} categories={categories} params={params} />;
}
