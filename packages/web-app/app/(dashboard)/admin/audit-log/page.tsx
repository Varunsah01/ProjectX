import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import { listAuditLogsForOrganization } from "@/lib/queries/audit-logs";
import AuditLogPageClient from "./page-client";

export default async function AuditLogPage() {
  const user = await getCurrentUser();

  if (!user || !hasPermission(user.role, "settings:audit")) {
    redirect("/");
  }

  const data = await listAuditLogsForOrganization(user.organizationId, {
    pageSize: 50,
  });

  return <AuditLogPageClient initialData={data} />;
}
