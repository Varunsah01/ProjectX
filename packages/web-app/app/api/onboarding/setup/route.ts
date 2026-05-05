import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import type { ConsentPurpose } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifyWelcomeUser } from "@/lib/notifications";

const VALID_PURPOSES: ConsentPurpose[] = [
  "SERVICE_DELIVERY",
  "COMMUNICATION",
  "ANALYTICS",
  "MARKETING",
];

type SetupBody =
  | { mode: "create"; orgName: string; consents: string[] }
  | { mode: "join"; invitationToken: string; consents: string[] };

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = (session.user.email ?? "").trim().toLowerCase();

    // Idempotency guard: user must not already be a member of any org
    const existingMemberships = await db.orgMembership.findMany({
      where: { userId },
    });
    if (existingMemberships.length > 0) {
      return NextResponse.json(
        { error: "This account is already part of an organization." },
        { status: 409 },
      );
    }

    const body = (await request.json()) as SetupBody;
    const grantedPurposes = (body.consents ?? []).filter(
      (p): p is ConsentPurpose => VALID_PURPOSES.includes(p as ConsentPurpose),
    );

    if (body.mode === "join") {
      // ── Join via invitation ─────────────────────────────────────────────
      const { invitationToken } = body;

      const invitation = await db.orgInvitation.findUnique({
        where: { token: invitationToken },
        include: {
          organization: { select: { id: true, name: true } },
        },
      });

      if (
        !invitation ||
        invitation.acceptedAt !== null ||
        invitation.expiresAt < new Date()
      ) {
        return NextResponse.json(
          { error: "This invitation is invalid or has expired." },
          { status: 400 },
        );
      }

      if (invitation.email.trim().toLowerCase() !== userEmail) {
        return NextResponse.json(
          { error: "This invitation was sent to a different email address." },
          { status: 403 },
        );
      }

      const orgId = invitation.organization.id;

      await db.$transaction(async (tx) => {
        await tx.orgMembership.create({
          data: {
            userId,
            organizationId: orgId,
            role:           invitation.role,
          },
        });
        await tx.orgInvitation.update({
          where: { id: invitation.id },
          data:  { acceptedAt: new Date() },
        });
        for (const purpose of grantedPurposes) {
          await tx.consent.create({
            data: {
              organizationId:     orgId,
              dataPrincipalId:    userId,
              dataPrincipalType:  "USER",
              purpose,
              status:             "GRANTED",
              grantedAt:          new Date(),
              legalBasis:         "Explicit consent during account setup",
              evidence:           { source: "onboarding_form" },
            },
          });
        }
      });

      const memberships = await db.orgMembership.findMany({
        where:   { userId },
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({
        ok:           true,
        activeOrgId:  orgId,
        activeRole:   invitation.role,
        memberships:  memberships.map((m) => ({
          organizationId: m.organizationId,
          role:           m.role,
          orgName:        m.organization.name,
        })),
      });
    }

    // ── Create new organization ────────────────────────────────────────────
    if (body.mode === "create") {
      const orgName = body.orgName?.trim() ?? "";
      if (!orgName) {
        return NextResponse.json(
          { error: "Organization name is required." },
          { status: 400 },
        );
      }

      let orgId: string;

      await db.$transaction(async (tx) => {
        const slugBase = slugify(orgName);
        let slug = slugBase;
        let suffix = 1;
        while (await tx.organization.findUnique({ where: { slug } })) {
          suffix += 1;
          slug = `${slugBase}-${suffix}`;
        }

        const organization = await tx.organization.create({
          data: {
            name:    orgName,
            slug,
            phone:   "",
            email:   userEmail,
            address: "",
            city:    "",
          },
        });

        orgId = organization.id;

        await tx.orgMembership.create({
          data: {
            userId,
            organizationId: organization.id,
            role:           UserRole.ADMIN,
          },
        });

        for (const purpose of grantedPurposes) {
          await tx.consent.create({
            data: {
              organizationId:     organization.id,
              dataPrincipalId:    userId,
              dataPrincipalType:  "USER",
              purpose,
              status:             "GRANTED",
              grantedAt:          new Date(),
              legalBasis:         "Explicit consent during account setup",
              evidence:           { source: "onboarding_form" },
            },
          });
        }
      });

      // Fire-and-forget welcome notification
      notifyWelcomeUser(userId).catch((err) =>
        console.error("Failed to send welcome notification", err),
      );

      const memberships = await db.orgMembership.findMany({
        where:   { userId },
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({
        ok:           true,
        activeOrgId:  orgId!,
        activeRole:   UserRole.ADMIN,
        memberships:  memberships.map((m) => ({
          organizationId: m.organizationId,
          role:           m.role,
          orgName:        m.organization.name,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  } catch (error) {
    console.error("Onboarding setup error", error);
    return NextResponse.json(
      { error: "Unable to complete setup. Please try again." },
      { status: 500 },
    );
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "organization";
}
