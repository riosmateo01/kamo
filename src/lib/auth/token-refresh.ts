/**
 * OAuth token refresh for Harvest + QBO when refresh_token is stored.
 * Updates connection_tokens in place. AES-256-GCM via encryptToken.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { connectionTokens } from "@/db/schema";
import {
  decryptToken,
  encryptToken,
} from "@/lib/auth/crypto";
import {
  getHarvestOAuthConfig,
  getQboOAuthConfig,
  harvestEndpoints,
  qboEndpoints,
} from "@/lib/auth/oauth-config";
import { fetchJson } from "@/lib/http/fetch-json";

export type RefreshedTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date | null;
};

type TokenRow = typeof connectionTokens.$inferSelect;

function isExpiredOrNear(expiresAt: Date | null | undefined, skewMs = 60_000): boolean {
  if (!expiresAt) return false; // unknown expiry — don't force refresh
  return expiresAt.getTime() <= Date.now() + skewMs;
}

async function refreshHarvest(refreshToken: string): Promise<RefreshedTokens> {
  const config = getHarvestOAuthConfig();
  if (!config) {
    throw new Error("Harvest OAuth env not configured — cannot refresh");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });
  const json = await fetchJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }>(harvestEndpoints().token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!json.access_token) {
    throw new Error(
      json.error_description || json.error || "Harvest refresh failed"
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt:
      json.expires_in != null
        ? new Date(Date.now() + json.expires_in * 1000)
        : null,
  };
}

async function refreshQbo(refreshToken: string): Promise<RefreshedTokens> {
  const config = getQboOAuthConfig();
  if (!config) {
    throw new Error("QBO OAuth env not configured — cannot refresh");
  }
  const basic = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const json = await fetchJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    x_refresh_token_expires_in?: number;
    error?: string;
    error_description?: string;
  }>(qboEndpoints().token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!json.access_token) {
    throw new Error(
      json.error_description || json.error || "QBO refresh failed"
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt:
      json.expires_in != null
        ? new Date(Date.now() + json.expires_in * 1000)
        : null,
  };
}

async function persistRefresh(
  row: TokenRow,
  refreshed: RefreshedTokens
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .update(connectionTokens)
    .set({
      accessTokenCipher: encryptToken(refreshed.accessToken),
      refreshTokenCipher: refreshed.refreshToken
        ? encryptToken(refreshed.refreshToken)
        : row.refreshTokenCipher,
      expiresAt: refreshed.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(connectionTokens.id, row.id));
}

/**
 * Ensure a usable access token for the provider row.
 * Refreshes when expired (or near expiry) and a refresh token exists.
 */
export async function ensureFreshAccessToken(
  row: TokenRow
): Promise<string> {
  const access = decryptToken(row.accessTokenCipher);

  const needsRefresh = isExpiredOrNear(row.expiresAt);
  if (!needsRefresh) return access;

  if (!row.refreshTokenCipher) {
    // Expired with no refresh — return current token and let API fail clearly
    return access;
  }

  const refreshPlain = decryptToken(row.refreshTokenCipher);
  if (refreshPlain.startsWith("fixture-")) {
    return access;
  }

  const refreshed =
    row.provider === "harvest"
      ? await refreshHarvest(refreshPlain)
      : await refreshQbo(refreshPlain);

  await persistRefresh(row, refreshed);
  return refreshed.accessToken;
}

export { isExpiredOrNear, refreshHarvest, refreshQbo };
