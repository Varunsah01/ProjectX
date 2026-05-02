import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import ImportPageClient from "./page-client";

export default async function ImportPage() {
  const user = await getCurrentUser();

  if (!user || !hasPermission(user.role, "customers:create")) {
    redirect("/");
  }

  return <ImportPageClient />;
}
