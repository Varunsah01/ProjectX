import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getOrganizationBranding } from "@/lib/organization";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalSessionProvider } from "@/components/providers/PortalSessionProvider";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) {
    redirect("/login");
  }

  const org = await getOrganizationBranding(session.user.organizationId);
  if (!org) {
    redirect("/org-not-found");
  }

  return (
    <PortalSessionProvider>
      <PortalShell orgName={org.name} orgLogo={org.logo}>
        {children}
      </PortalShell>
    </PortalSessionProvider>
  );
}
