/**
 * AES-256-GCM token encryption.
 * Format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 *
 * TOKEN_ENCRYPTION_KEY: 32-byte key as base64 or hex.
 * Generate: openssl rand -base64 32
 *
 * Migration: stub-v1: Base64 tokens from crypto-stub will NOT decrypt.
 * Re-connect OAuth after deploying Phase 1.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

export class TokenCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenCryptoError";
  }
}

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  // hex (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  // base64
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length !== KEY_LEN) {
    throw new TokenCryptoError(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${buf.length}). Use: openssl rand -base64 32`
    );
  }
  return buf;
}

export function getTokenEncryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new TokenCryptoError(
      "TOKEN_ENCRYPTION_KEY is not set. Generate with: openssl rand -base64 32"
    );
  }
  return parseKey(raw);
}

/** True when a key is configured (does not validate length until encrypt/decrypt). */
export function isTokenEncryptionConfigured(): boolean {
  return Boolean(process.env.TOKEN_ENCRYPTION_KEY?.trim());
}

export function encryptToken(plaintext: string): string {
  const key = getTokenEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptToken(encoded: string): string {
  if (encoded.startsWith("stub-v1:")) {
    throw new TokenCryptoError(
      "Legacy stub-v1 token — re-connect OAuth (AES-256-GCM required)"
    );
  }
  if (!encoded.startsWith(PREFIX) && !encoded.startsWith("v1:")) {
    throw new TokenCryptoError("Unrecognized token ciphertext format");
  }
  const parts = encoded.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new TokenCryptoError("Malformed v1 token ciphertext");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const key = getTokenEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new TokenCryptoError("Invalid IV or auth tag length");
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** @deprecated Use encryptToken — kept for gradual import migration */
export const encryptTokenStub = encryptToken;
/** @deprecated Use decryptToken */
export const decryptTokenStub = decryptToken;
