import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import PrivacyClient from "./page-client";

export default async function PortalPrivacyPage() {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const [organization, consents] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        name: true,
        grievanceOfficerName: true,
        grievanceOfficerEmail: true,
        grievanceOfficerPhone: true,
      },
    }),
    db.consent.findMany({
      where: {
        organizationId,
        dataPrincipalId: customerId,
        dataPrincipalType: "CUSTOMER",
      },
      orderBy: { purpose: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Privacy & Data" />
      <PrivacyClient
        organization={JSON.parse(JSON.stringify(organization))}
        consents={JSON.parse(JSON.stringify(consents))}
        customerId={customerId}
        organizationId={organizationId}
      />
    </div>
  );
}
