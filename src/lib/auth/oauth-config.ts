/** Env-backed OAuth config. Missing vars → friendly error pages on callbacks. */

export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getHarvestOAuthConfig(): OAuthProviderConfig | null {
  const clientId = process.env.HARVEST_CLIENT_ID?.trim();
  const clientSecret = process.env.HARVEST_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.HARVEST_REDIRECT_URI?.trim() ||
    `${getAppBaseUrl()}/api/auth/harvest/callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function getQboOAuthConfig(): OAuthProviderConfig | null {
  const clientId = process.env.QBO_CLIENT_ID?.trim();
  const clientSecret = process.env.QBO_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.QBO_REDIRECT_URI?.trim() ||
    `${getAppBaseUrl()}/api/auth/qbo/callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function getSessionSecret(): string | null {
  return process.env.SESSION_SECRET?.trim() || null;
}

export function qboEnvironment(): "sandbox" | "production" {
  return process.env.QBO_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
}

/** Intuit authorize + token endpoints */
export function qboEndpoints() {
  return {
    authorize: "https://appcenter.intuit.com/connect/oauth2",
    token: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  };
}

/** Harvest OAuth (accounts.getharvest.com) */
export function harvestEndpoints() {
  return {
    authorize: "https://id.getharvest.com/oauth2/authorize",
    token: "https://id.getharvest.com/api/v2/oauth2/token",
  };
}
