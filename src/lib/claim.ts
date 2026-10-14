import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * A guest asks to save a moment: we email a sign-in link that ends on /api/claim?t=TOKEN.
 * If the link opens on the same device, better-auth already moved the guest's data.
 * If it opens elsewhere (another phone, the mail app's browser), the token tells us which guest to move.
 */
type Claim = { guestId: string; shareId: string; locale: string; exp: number };

const TTL_MS = 24 * 60 * 60 * 1000;

function sign(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(`claim:${payload}`).digest("base64url");
}

export function createClaimToken(data: Omit<Claim, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readClaimToken(token: string): Claim | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claim;
    return typeof data.exp === "number" && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
