/**
 * CSRF token utilities — Edge-runtime compatible.
 *
 * Tokens are HMAC-SHA256(seed, secret), hex-encoded, truncated to 32 chars.
 * For web sessions the seed is the JWT's `csrfSeed` field.
 * For mobile sessions the seed is the Bearer session token.
 */

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("CSRF: missing AUTH_SECRET or NEXTAUTH_SECRET");
  return secret;
}

async function hmacSha256(data: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function generateCsrfToken(seed: string): Promise<string> {
  return hmacSha256(seed, getSecret());
}

export async function verifyCsrfToken(
  token: string,
  seed: string,
): Promise<boolean> {
  const expected = await generateCsrfToken(seed);
  return timingSafeEqual(token, expected);
}
