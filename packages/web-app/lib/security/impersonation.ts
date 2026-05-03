import { SignJWT, jwtVerify } from "jose";

export interface ImpersonationPayload {
  sessionId: string;
  supportUserId: string;
  targetUserId: string;
  targetOrgId: string;
}

const COOKIE_NAME = "__impersonate";
const INFO_COOKIE_NAME = "__imp_info";
const TTL_SECONDS = 15 * 60; // 15 minutes

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signImpersonationToken(
  payload: ImpersonationPayload,
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyImpersonationToken(
  token: string,
): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { sessionId, supportUserId, targetUserId, targetOrgId } = payload as Record<string, string>;
    if (!sessionId || !supportUserId || !targetUserId || !targetOrgId) return null;
    return { sessionId, supportUserId, targetUserId, targetOrgId };
  } catch {
    return null;
  }
}

export function makeImpersonateCookieHeader(token: string): string {
  const flags = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${TTL_SECONDS}`,
    "Path=/",
  ];
  return flags.join("; ");
}

export function makeInfoCookieHeader(info: { name: string; email: string }): string {
  const value = Buffer.from(JSON.stringify(info)).toString("base64");
  const flags = [
    `${INFO_COOKIE_NAME}=${value}`,
    "SameSite=Strict",
    `Max-Age=${TTL_SECONDS}`,
    "Path=/",
  ];
  return flags.join("; ");
}

export function clearImpersonateCookieHeaders(): string[] {
  return [
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
    `${INFO_COOKIE_NAME}=; SameSite=Strict; Max-Age=0; Path=/`,
  ];
}
