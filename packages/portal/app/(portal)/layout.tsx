import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getOrganizationBranding } from "@/lib/organization";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalSessionProvider } from "@/components/providers/PortalSessionProvider";
import { GrowthBookProvider } from "@/components/providers/GrowthBookProvider";
import { getSerializedFeatures } from "@/lib/feature-flags/server";

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

  const serializedFeatures = await getSerializedFeatures();
  const attributes = {
    userId: session.user.customerId,
    orgId: session.user.organizationId,
  };

  return (
    <GrowthBookProvider serializedFeatures={serializedFeatures} attributes={attributes}>
      <PortalSessionProvider>
        <PortalShell orgName={org.name} orgLogo={org.logo}>
          {children}
        </PortalShell>
      </PortalSessionProvider>
    </GrowthBookProvider>
  );
}
