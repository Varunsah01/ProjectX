import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import { getBreachDetail } from "@/lib/queries/compliance";
import BreachDetailClient from "./page-client";

export default async function BreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "compliance:view")) {
    redirect("/");
  }

  const { id } = await params;
  const breach = await getBreachDetail(user.organizationId, id);

  if (!breach) {
    notFound();
  }

  return <BreachDetailClient breach={JSON.parse(JSON.stringify(breach))} />;
}
