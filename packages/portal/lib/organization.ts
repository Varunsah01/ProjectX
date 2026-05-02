import { db } from "@/lib/db";
import { headers } from "next/headers";

export interface OrgBranding {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  email: string;
  phone: string;
}

export async function getOrganizationSlug(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("x-portal-org-slug") ?? null;
}

export async function getOrganizationBySlug(
  slug: string,
): Promise<OrgBranding | null> {
  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      email: true,
      phone: true,
    },
  });

  return org;
}

export async function getOrganizationBranding(
  organizationId: string,
): Promise<OrgBranding | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      email: true,
      phone: true,
    },
  });

  return org;
}
