import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import { getWebhookEvents } from "@/lib/queries/webhooks";
import WebhooksPageClient from "./page-client";

export default async function WebhooksPage() {
  const user = await getCurrentUser();

  if (!user || !hasPermission(user.role, "settings:audit")) {
    redirect("/");
  }

  const data = await getWebhookEvents({ pageSize: 50 });
  return <WebhooksPageClient initialData={data} />;
}
