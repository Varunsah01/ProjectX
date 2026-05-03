import { db } from "@/lib/db";
import { mapAuditLogEntry, mapPlan, mapTeamMember } from "@/lib/data-mappers";
import { getCurrentUser } from "@/lib/auth-utils";
import { getOrganizationContext } from "@/lib/query-utils";
import { hasPermission } from "@/lib/security/rbac";
import { getPresignedGetUrl, isStorageConfigured } from "@/lib/storage/s3";
import type { SettingsData } from "@/lib/types";

export async function getSettingsDataForOrganization(
  organizationId: string,
  options: {
    includeBusinessProfile?: boolean;
    includeTeamMembers?: boolean;
    includeAuditLogs?: boolean;
  } = {},
): Promise<SettingsData> {
  const [
    organization,
    teamMembers,
    plans,
    auditLogs,
  ] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: {
        id: organizationId,
      },
    }),
    options.includeTeamMembers
      ? db.user.findMany({
          where: {
            organizationId,
            status: { not: "REMOVED" },
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 200,
        })
      : Promise.resolve([]),
    db.plan.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        name: "asc",
      },
      take: 200,
    }),
    options.includeAuditLogs
      ? db.auditLog.findMany({
          where: {
            organizationId,
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  let logoPreviewUrl: string | undefined;
  let signaturePreviewUrl: string | undefined;
  if (options.includeBusinessProfile && isStorageConfigured()) {
    if (organization.logo) {
      logoPreviewUrl = await getPresignedGetUrl(organization.logo).catch(() => undefined);
    }
    if (organization.signatureUrl) {
      signaturePreviewUrl = await getPresignedGetUrl(organization.signatureUrl).catch(() => undefined);
    }
  }

  return {
    businessProfile: options.includeBusinessProfile
      ? {
          businessName: organization.name,
          phone: organization.phone,
          email: organization.email,
          address: organization.address,
          city: organization.city,
          gstin: organization.gstin ?? "",
          placeOfBusinessState: organization.placeOfBusinessState ?? "",
          legalName: organization.legalName ?? undefined,
          logo: organization.logo ?? undefined,
          logoPreviewUrl,
          signatureUrl: organization.signatureUrl ?? undefined,
          signaturePreviewUrl,
          pan: organization.pan ?? undefined,
          bankName: organization.bankName ?? undefined,
          bankAccountNumber: organization.bankAccountNumber ?? undefined,
          bankIfsc: organization.bankIfsc ?? undefined,
          bankBranch: organization.bankBranch ?? undefined,
          upiId: organization.upiId ?? undefined,
          invoiceTerms: organization.invoiceTerms ?? undefined,
          grievanceOfficerName: organization.grievanceOfficerName ?? undefined,
          grievanceOfficerEmail: organization.grievanceOfficerEmail ?? undefined,
          grievanceOfficerPhone: organization.grievanceOfficerPhone ?? undefined,
          accountantEmail: organization.accountantEmail ?? undefined,
          exportFormat: organization.exportFormat ?? undefined,
        }
      : null,
    teamMembers: teamMembers.map(mapTeamMember),
    plans: plans.map(mapPlan),
    auditLogs: auditLogs.map(mapAuditLogEntry),
    notificationSettings: (organization.notificationSettings as Record<string, unknown>) ?? {},
  };
}

export async function getSettingsData() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getOrganizationContext(),
  ]);

  return getSettingsDataForOrganization(context.organizationId, {
    includeBusinessProfile: Boolean(
      user && hasPermission(user.role, "settings:business"),
    ),
    includeTeamMembers: Boolean(user && hasPermission(user.role, "settings:team")),
    includeAuditLogs: Boolean(user && hasPermission(user.role, "settings:audit")),
  });
}
