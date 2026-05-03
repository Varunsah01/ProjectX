import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyImpersonationToken } from "@/lib/security/impersonation";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  avatar: string | null;
  image: string | null;
  organizationId: string;
  role: UserRole;
  actUserId?: string;
  impersonationSessionId?: string;
};

export async function getServerSession() {
  return auth();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // 1. Check for active impersonation session
  const cookieStore = await cookies();
  const impCookie = cookieStore.get("__impersonate")?.value;

  if (impCookie) {
    const imp = await verifyImpersonationToken(impCookie);
    if (imp) {
      const membership = await db.orgMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: imp.targetUserId,
            organizationId: imp.targetOrgId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              avatar: true,
              image: true,
            },
          },
        },
      });

      if (membership) {
        return {
          ...membership.user,
          organizationId: imp.targetOrgId,
          role: membership.role,
          actUserId: imp.supportUserId,
          impersonationSessionId: imp.sessionId,
        };
      }
    }
  }

  // 2. Normal NextAuth session
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      avatar: true,
      image: true,
      memberships: {
        where: { organizationId: session.user.activeOrgId },
        select: { organizationId: true, role: true },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return null;
  }

  const membership = user.memberships[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    avatar: user.avatar,
    image: user.image,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user?.organizationId) {
    throw new Error("Unauthorized");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return user;
}

/**
 * Require the caller to be a SUPPORT user.
 * Does NOT check for impersonation — SUPPORT users authenticate via their own session.
 */
export async function requireSupport(): Promise<{
  id: string;
  organizationId: string;
  role: "SUPPORT";
  name: string;
  email: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (session.user.activeRole !== "SUPPORT") {
    throw new Error("Forbidden");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { organizationId: session.user.activeOrgId },
        select: { organizationId: true },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    throw new Error("Unauthorized");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organizationId: user.memberships[0].organizationId,
    role: "SUPPORT",
  };
}

/**
 * Throws if the current request is running inside an impersonation session.
 * Use at the start of sensitive server actions (refunds, password changes, etc.).
 */
export async function blockIfImpersonated(): Promise<void> {
  const user = await getCurrentUser();
  if (user?.actUserId) {
    throw new Error("IMPERSONATION_BLOCKED: This action is not permitted during impersonation");
  }
}

export { UserRole };
