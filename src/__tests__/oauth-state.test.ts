import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createOAuthState,
  verifyOAuthState,
} from "@/lib/auth/oauth-state";

describe("OAuth signed state", () => {
  const prev = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-for-hmac-state";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prev;
  });

  it("creates and verifies state with org/user", () => {
    const state = createOAuthState({
      orgId: "org_abc",
      userId: "user_xyz",
      provider: "harvest",
    });
    const result = verifyOAuthState(state, {
      provider: "harvest",
      orgId: "org_abc",
      userId: "user_xyz",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.orgId).toBe("org_abc");
      expect(result.payload.userId).toBe("user_xyz");
      expect(result.payload.provider).toBe("harvest");
      expect(result.payload.nonce).toBeTruthy();
    }
  });

  it("rejects provider mismatch", () => {
    const state = createOAuthState({
      orgId: "org_abc",
      userId: "user_xyz",
      provider: "harvest",
    });
    const result = verifyOAuthState(state, { provider: "qbo" });
    expect(result.ok).toBe(false);
  });

  it("rejects org mismatch", () => {
    const state = createOAuthState({
      orgId: "org_abc",
      userId: "user_xyz",
      provider: "qbo",
    });
    const result = verifyOAuthState(state, {
      provider: "qbo",
      orgId: "org_other",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects tampered signature", () => {
    const state = createOAuthState({
      orgId: "org_abc",
      userId: "user_xyz",
      provider: "harvest",
    });
    const [body] = state.split(".");
    const result = verifyOAuthState(`${body}.deadbeef`, { provider: "harvest" });
    expect(result.ok).toBe(false);
  });
});
