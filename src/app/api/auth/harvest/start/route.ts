import { NextResponse } from "next/server";
import {
  getHarvestOAuthConfig,
  harvestEndpoints,
  getSessionSecret,
} from "@/lib/auth/oauth-config";
import { oauthErrorHtml } from "@/lib/auth/html-error";
import { createOAuthState } from "@/lib/auth/oauth-state";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await requireOrg();
  if (!isOrgResult(org)) {
    return oauthErrorHtml({
      title: "Sign in required",
      message:
        "Connect Harvest requires an authenticated Clerk user with an active organization.",
      hint: "Sign in at /sign-in and select or create an organization.",
    });
  }

  const config = getHarvestOAuthConfig();
  if (!config) {
    return oauthErrorHtml({
      title: "Harvest OAuth not configured",
      message:
        "Set HARVEST_CLIENT_ID, HARVEST_CLIENT_SECRET, and HARVEST_REDIRECT_URI in .env (see .env.example). Create an app at https://id.getharvest.com/developers",
      hint: "Until then, use POST /api/sync/seed-fixtures with Postgres for a local live-mode demo.",
    });
  }

  if (!getSessionSecret()) {
    return oauthErrorHtml({
      title: "SESSION_SECRET missing",
      message: "Set SESSION_SECRET in .env before starting OAuth (used for state).",
    });
  }

  let state: string;
  try {
    state = createOAuthState({
      orgId: org.orgId,
      userId: org.userId,
      provider: "harvest",
    });
  } catch (err) {
    return oauthErrorHtml({
      title: "Could not create OAuth state",
      message: err instanceof Error ? err.message : "state error",
    });
  }

  const url = new URL(harvestEndpoints().authorize);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("oauth_harvest_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
