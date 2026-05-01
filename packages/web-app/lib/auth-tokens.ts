import { randomBytes } from "node:crypto";
import { compare, hash } from "bcrypt";

const TOKEN_BYTES = 32;
const SELECTOR_HEX_LEN = 32; // first 16 bytes → 32 hex chars
const BCRYPT_COST = 8;

/** Token TTL: 1 hour */
export const TOKEN_TTL_MS = 3_600_000;

export interface GeneratedToken {
  /** Full 64-char hex string for the URL */
  raw: string;
  /** First 32 hex chars — stored plaintext as DB lookup key */
  selector: string;
  /** Bcrypt hash of the last 32 hex chars */
  tokenHash: string;
  /** Expiry timestamp (now + 1 hour) */
  expiresAt: Date;
}

export async function generateToken(): Promise<GeneratedToken> {
  const bytes = randomBytes(TOKEN_BYTES);
  const raw = bytes.toString("hex"); // 64 chars
  const selector = raw.slice(0, SELECTOR_HEX_LEN);
  const verifier = raw.slice(SELECTOR_HEX_LEN);
  const tokenHash = await hash(verifier, BCRYPT_COST);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  return { raw, selector, tokenHash, expiresAt };
}

export function splitRawToken(raw: string): {
  selector: string;
  verifier: string;
} {
  if (raw.length !== TOKEN_BYTES * 2 || !/^[0-9a-f]+$/.test(raw)) {
    throw new Error("Invalid token format");
  }

  return {
    selector: raw.slice(0, SELECTOR_HEX_LEN),
    verifier: raw.slice(SELECTOR_HEX_LEN),
  };
}

export async function verifyTokenHash(
  verifier: string,
  tokenHash: string,
): Promise<boolean> {
  return compare(verifier, tokenHash);
}
