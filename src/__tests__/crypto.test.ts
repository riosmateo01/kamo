import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptToken,
  encryptToken,
  TokenCryptoError,
} from "@/lib/auth/crypto";
import { randomBytes } from "node:crypto";

describe("AES-256-GCM token crypto", () => {
  const prev = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = prev;
  });

  it("round-trips plaintext", () => {
    const plain = "access-token-xyz-🔐";
    const cipher = encryptToken(plain);
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher.split(":")).toHaveLength(4);
    expect(decryptToken(cipher)).toBe(plain);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const a = encryptToken("same");
    const b = encryptToken("same");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same");
    expect(decryptToken(b)).toBe("same");
  });

  it("rejects legacy stub-v1 tokens", () => {
    expect(() => decryptToken("stub-v1:YWJj")).toThrow(TokenCryptoError);
  });

  it("rejects tampered ciphertext", () => {
    const cipher = encryptToken("secret");
    const parts = cipher.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptToken(parts.join(":"))).toThrow();
  });

  it("accepts hex 32-byte keys", () => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    expect(decryptToken(encryptToken("hex-key"))).toBe("hex-key");
  });
});
