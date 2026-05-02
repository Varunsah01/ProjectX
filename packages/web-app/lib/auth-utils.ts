import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function getServerSession() {
  return auth();
}

export async function getCurrentUser() {
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

export { UserRole };
