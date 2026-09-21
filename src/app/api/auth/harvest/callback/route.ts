import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  getHarvestOAuthConfig,
  harvestEndpoints,
} from "@/lib/auth/oauth-config";
import { oauthErrorHtml, oauthSuccessHtml } from "@/lib/auth/html-error";
import { getDb, isDatabaseConfigured } from "@/db/client";
import { connectionTokens } from "@/db/schema";
import { encryptToken } from "@/lib/auth/crypto";
import { newId } from "@/lib/sync/id";
import { fetchHarvestAccountId } from "@/lib/connectors/harvest/http";
import { verifyOAuthState } from "@/lib/auth/oauth-state";
import { appendAuditEvent } from "@/lib/audit/events";
import { runWithOrgAsync } from "@/lib/auth/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const config = getHarvestOAuthConfig();
  if (!config) {
    return oauthErrorHtml({
      title: "Harvest OAuth not configured",
      message:
        "Env vars HARVEST_CLIENT_ID / HARVEST_CLIENT_SECRET are missing. Add them from your Harvest developer app, then retry Connect.",
      hint: "Docs: SPIKE-2.md · https://id.getharvest.com/developers",
    });
  }

  const url = req.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return oauthErrorHtml({
      title: "Harvest authorization denied",
      message: error,
      hint: url.searchParams.get("error_description") ?? undefined,
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_harvest_state")?.value;

  if (!code) {
    return oauthErrorHtml({
      title: "Missing authorization code",
      message: "Harvest callback did not include ?code=. Start again from Connections.",
    });
  }

  if (!state || !cookieState || state !== cookieState) {
    return oauthErrorHtml({
      title: "Invalid OAuth state",
      message: "State mismatch — possible CSRF or expired cookie. Try Connect again.",
    });
  }

  const verified = verifyOAuthState(state, { provider: "harvest" });
  if (!verified.ok) {
    return oauthErrorHtml({
      title: "Invalid OAuth state",
      message: verified.error,
    });
  }

  const { orgId, userId } = verified.payload;

  let tokenJson: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  try {
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch(harvestEndpoints().token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    tokenJson = (await tokenRes.json()) as typeof tokenJson;
    if (!tokenRes.ok || !tokenJson.access_token) {
      return oauthErrorHtml({
        title: "Harvest token exchange failed",
        message:
          tokenJson.error_description ||
          tokenJson.error ||
          `HTTP ${tokenRes.status}`,
        hint: "Verify client id/secret and redirect URI match the Harvest app exactly.",
      });
    }
  } catch (err) {
    return oauthErrorHtml({
      title: "Harvest token exchange error",
      message: err instanceof Error ? err.message : "Network error during token exchange",
      hint: "Check outbound network and Harvest status.",
    });
  }

  return runWithOrgAsync({ orgId, userId }, async () => {
    let accountId = process.env.HARVEST_ACCOUNT_ID?.trim() || "";
    let accountName = "Harvest";
    try {
      const acct = await fetchHarvestAccountId(tokenJson.access_token!);
      if (acct) {
        accountId = acct.accountId;
        accountName = acct.name || accountName;
      }
    } catch {
      /* fall through */
    }

    if (!isDatabaseConfigured() || !getDb()) {
      return oauthSuccessHtml({
        provider: "Harvest",
        detail:
          "Token exchange succeeded, but DATABASE_URL is not set — tokens were not persisted. Set Postgres, migrate, and reconnect.",
      });
    }

    const db = getDb()!;
    const now = new Date();
    const expiresAt =
      tokenJson.expires_in != null
        ? new Date(now.getTime() + tokenJson.expires_in * 1000)
        : null;

    try {
      await db
        .delete(connectionTokens)
        .where(
          and(
            eq(connectionTokens.organizationId, orgId),
            eq(connectionTokens.provider, "harvest")
          )
        );
      await db.insert(connectionTokens).values({
        id: newId("tok"),
        organizationId: orgId,
        provider: "harvest",
        accountLabel: accountName,
        accessTokenCipher: encryptToken(tokenJson.access_token!),
        refreshTokenCipher: tokenJson.refresh_token
          ? encryptToken(tokenJson.refresh_token)
          : null,
        expiresAt,
        realmId: accountId || null,
        scopes: null,
        updatedAt: now,
      });
    } catch (err) {
      return oauthErrorHtml({
        title: "Could not store Harvest token",
        message: err instanceof Error ? err.message : "DB write failed",
        hint: "Run npm run db:migrate then retry. Ensure TOKEN_ENCRYPTION_KEY is set.",
      });
    }

    await appendAuditEvent({
      organizationId: orgId,
      actorUserId: userId,
      action: "oauth.connect",
      resource: "harvest",
      meta: { accountId: accountId || null },
    });

    return oauthSuccessHtml({
      provider: "Harvest",
      detail: accountId
        ? `Connected (account ${accountId}). Run Sync now from Connections to pull live data.`
        : "Connected, but account id was not resolved. Set HARVEST_ACCOUNT_ID or reconnect. Run Sync now after fixing.",
    });
  });
}
