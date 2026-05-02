import { auth } from "@/auth";

export async function getPortalSession() {
  const session = await auth();
  if (!session?.user?.customerId || !session?.user?.organizationId) {
    return null;
  }
  return session;
}

export async function requirePortalAuth() {
  const session = await getPortalSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
