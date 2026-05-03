import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import ComplianceDashboard from "./page-client";

export default async function CompliancePage() {
  const user = await getCurrentUser();

  if (!user || !hasPermission(user.role, "compliance:view")) {
    redirect("/");
  }

  return <ComplianceDashboard />;
}
