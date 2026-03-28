import type { UserRole } from "@prisma/client";
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

  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      organizationId: true,
      avatar: true,
      image: true,
    },
  });
}

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
