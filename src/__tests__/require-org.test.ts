import { afterEach, describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  clearRequireOrgMock,
  isOrgResult,
  requireOrg,
  setRequireOrgMock,
} from "@/lib/auth/require-org";

describe("requireOrg mockability", () => {
  afterEach(() => {
    clearRequireOrgMock();
  });

  it("returns mocked org without live Clerk", async () => {
    setRequireOrgMock(async () => ({
      orgId: "org_test",
      userId: "user_test",
    }));
    const result = await requireOrg();
    expect(isOrgResult(result)).toBe(true);
    if (isOrgResult(result)) {
      expect(result.orgId).toBe("org_test");
      expect(result.userId).toBe("user_test");
    }
  });

  it("can mock 403 response", async () => {
    setRequireOrgMock(async () =>
      NextResponse.json({ error: "Organization required" }, { status: 403 })
    );
    const result = await requireOrg();
    expect(isOrgResult(result)).toBe(false);
    expect(result).toBeInstanceOf(NextResponse);
  });
});
