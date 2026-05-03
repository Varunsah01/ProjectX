import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import { getDsrDetail } from "@/lib/queries/compliance";
import DsrDetailClient from "./page-client";

export default async function DsrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "compliance:view")) {
    redirect("/");
  }

  const { id } = await params;
  const dsr = await getDsrDetail(user.organizationId, id);

  if (!dsr) {
    notFound();
  }

  return <DsrDetailClient dsr={JSON.parse(JSON.stringify(dsr))} />;
}
