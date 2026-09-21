/**
 * @deprecated Re-exports AES-256-GCM helpers from ./crypto.
 * Old stub-v1 Base64 tokens no longer decrypt — re-connect OAuth.
 */
export {
  encryptToken,
  decryptToken,
  encryptTokenStub,
  decryptTokenStub,
  isTokenEncryptionConfigured,
  TokenCryptoError,
} from "./crypto";
