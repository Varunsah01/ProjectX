import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getReconciliationData } from "@/lib/queries/reconciliation";
import {
  DEFAULT_PAGE_SIZE,
  readSearchParam,
  readNumberSearchParam,
} from "@/lib/url-search-params";
import ReconciliationPageClient from "./page-client";

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  const params = {
    search: readSearchParam(searchParams, "search") || undefined,
    page: readNumberSearchParam(searchParams, "page", 1),
    pageSize: readNumberSearchParam(searchParams, "pageSize", DEFAULT_PAGE_SIZE),
  };

  const data = await getReconciliationData(user.organizationId, params);

  return (
    <ReconciliationPageClient
      data={JSON.parse(JSON.stringify(data))}
      params={{
        search: params.search ?? "",
        page: params.page,
        pageSize: params.pageSize,
      }}
    />
  );
}
