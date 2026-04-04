import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getSettingsData } from "@/lib/queries/settings";
import { hasPermission } from "@/lib/security/rbac";
import SettingsPageClient from "./page-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user || !hasPermission(user.role, "settings:view")) {
    redirect("/");
  }

  const data = await getSettingsData();
  return <SettingsPageClient data={data} currentRole={user.role} currentUserId={user.id} />;
}
