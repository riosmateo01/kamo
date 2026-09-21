/**
 * Signed OAuth state: { orgId, userId, nonce, provider, exp }
 * HMAC-SHA256 with SESSION_SECRET. Verified on callback.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./oauth-config";

export type OAuthStatePayload = {
  orgId: string;
  userId: string;
  nonce: string;
  provider: "harvest" | "qbo";
  exp: number; // unix seconds
};

const TTL_SEC = 600;

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

export function createOAuthState(input: {
  orgId: string;
  userId: string;
  provider: "harvest" | "qbo";
}): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error("SESSION_SECRET missing");
  const payload: OAuthStatePayload = {
    orgId: input.orgId,
    userId: input.userId,
    nonce: randomBytes(16).toString("hex"),
    provider: input.provider,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export type VerifyOAuthStateResult =
  | { ok: true; payload: OAuthStatePayload }
  | { ok: false; error: string };

export function verifyOAuthState(
  state: string | null | undefined,
  expected: { orgId?: string; userId?: string; provider: "harvest" | "qbo" }
): VerifyOAuthStateResult {
  if (!state || !state.includes(".")) {
    return { ok: false, error: "Missing or malformed OAuth state" };
  }
  const secret = getSessionSecret();
  if (!secret) {
    return { ok: false, error: "SESSION_SECRET missing" };
  }
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    return { ok: false, error: "Malformed OAuth state" };
  }
  const expectedSig = sign(body, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid OAuth state signature" };
    }
  } catch {
    return { ok: false, error: "Invalid OAuth state signature" };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as OAuthStatePayload;
  } catch {
    return { ok: false, error: "Invalid OAuth state payload" };
  }

  if (payload.provider !== expected.provider) {
    return { ok: false, error: "OAuth state provider mismatch" };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "OAuth state expired" };
  }
  if (expected.orgId && payload.orgId !== expected.orgId) {
    return { ok: false, error: "OAuth state organization mismatch" };
  }
  if (expected.userId && payload.userId !== expected.userId) {
    return { ok: false, error: "OAuth state user mismatch" };
  }
  if (!payload.orgId || !payload.userId || !payload.nonce) {
    return { ok: false, error: "OAuth state missing identity fields" };
  }
  return { ok: true, payload };
}
