import { db } from "@/lib/db";
import { mapAuditLogEntry, mapPlan, mapTeamMember } from "@/lib/data-mappers";
import { getCurrentUser } from "@/lib/auth-utils";
import { getOrganizationContext } from "@/lib/query-utils";
import { hasPermission } from "@/lib/security/rbac";
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
        })
      : Promise.resolve([]),
    db.plan.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        name: "asc",
      },
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
