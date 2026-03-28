import { getCollectionsData } from "@/lib/queries/invoices";
import {
  DEFAULT_PAGE_SIZE,
  readNumberSearchParam,
  readSearchParam,
} from "@/lib/url-search-params";
import CollectionsPageClient from "./page-client";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = {
    search: readSearchParam(searchParams, "search"),
    bucket: readSearchParam(searchParams, "bucket", "all"),
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };
  const data = await getCollectionsData(params);
  return <CollectionsPageClient data={data} params={params} />;
}
