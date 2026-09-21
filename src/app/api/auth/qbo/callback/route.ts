import { NextRequest } from "next/server";
import {
  getQboOAuthConfig,
  qboEndpoints,
} from "@/lib/auth/oauth-config";
import { oauthErrorHtml, oauthSuccessHtml } from "@/lib/auth/html-error";
import { getDb, isDatabaseConfigured } from "@/db/client";
import { connectionTokens } from "@/db/schema";
import { encryptToken } from "@/lib/auth/crypto";
import { newId } from "@/lib/sync/id";
import { and, eq } from "drizzle-orm";
import { verifyOAuthState } from "@/lib/auth/oauth-state";
import { appendAuditEvent } from "@/lib/audit/events";
import { runWithOrgAsync } from "@/lib/auth/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const config = getQboOAuthConfig();
  if (!config) {
    return oauthErrorHtml({
      title: "QuickBooks OAuth not configured",
      message:
        "Env vars QBO_CLIENT_ID / QBO_CLIENT_SECRET are missing. Add them from your Intuit developer app, then retry Connect.",
      hint: "Docs: SPIKE-1.md · https://developer.intuit.com/app/developer/dashboard",
    });
  }

  const url = req.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return oauthErrorHtml({
      title: "QuickBooks authorization denied",
      message: error,
      hint: url.searchParams.get("error_description") ?? undefined,
    });
  }

  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_qbo_state")?.value;

  if (!code) {
    return oauthErrorHtml({
      title: "Missing authorization code",
      message: "QBO callback did not include ?code=. Start again from Connections.",
    });
  }

  if (!state || !cookieState || state !== cookieState) {
    return oauthErrorHtml({
      title: "Invalid OAuth state",
      message: "State mismatch — possible CSRF or expired cookie. Try Connect again.",
    });
  }

  const verified = verifyOAuthState(state, { provider: "qbo" });
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
    const basic = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString("base64");
    const body = new URLSearchParams({
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch(qboEndpoints().token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
      },
      body,
    });
    tokenJson = (await tokenRes.json()) as typeof tokenJson;
    if (!tokenRes.ok || !tokenJson.access_token) {
      return oauthErrorHtml({
        title: "QBO token exchange failed",
        message:
          tokenJson.error_description ||
          tokenJson.error ||
          `HTTP ${tokenRes.status}`,
        hint: "Verify client id/secret, redirect URI, and sandbox vs production.",
      });
    }
  } catch (err) {
    return oauthErrorHtml({
      title: "QBO token exchange error",
      message: err instanceof Error ? err.message : "Network error during token exchange",
    });
  }

  return runWithOrgAsync({ orgId, userId }, async () => {
    if (!isDatabaseConfigured() || !getDb()) {
      return oauthSuccessHtml({
        provider: "QuickBooks Online",
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
            eq(connectionTokens.provider, "qbo")
          )
        );
      await db.insert(connectionTokens).values({
        id: newId("tok"),
        organizationId: orgId,
        provider: "qbo",
        accountLabel: "QuickBooks Online",
        accessTokenCipher: encryptToken(tokenJson.access_token!),
        refreshTokenCipher: tokenJson.refresh_token
          ? encryptToken(tokenJson.refresh_token)
          : null,
        expiresAt,
        realmId: realmId,
        scopes: "com.intuit.quickbooks.accounting",
        updatedAt: now,
      });
    } catch (err) {
      return oauthErrorHtml({
        title: "Could not store QBO token",
        message: err instanceof Error ? err.message : "DB write failed",
        hint: "Run npm run db:migrate then retry. Ensure TOKEN_ENCRYPTION_KEY is set.",
      });
    }

    await appendAuditEvent({
      organizationId: orgId,
      actorUserId: userId,
      action: "oauth.connect",
      resource: "qbo",
      meta: { realmId: realmId || null },
    });

    return oauthSuccessHtml({
      provider: "QuickBooks Online",
      detail: `Connected${realmId ? ` (realm ${realmId})` : ""}. Tokens encrypted with AES-256-GCM. Run Sync now from Connections.`,
    });
  });
}
