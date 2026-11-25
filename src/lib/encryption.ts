import { randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from "crypto"

export const ENCRYPTION_ALGORITHM = "aes-256-gcm"
export const IV_LENGTH = 16
export const KEY_VERSION = 1

function getDocumentEncryptionKey(): Buffer {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY is not configured")
  }
  return createHash("sha256").update(raw).digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns `v<version>:iv:authTag:ciphertext` (all hex).
 */
export function encryptDocument(plaintext: string): string {
  const key = getDocumentEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  cipher.setAAD(Buffer.from(`forgedocs-doc-v${KEY_VERSION}`, "utf8"))
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `v${KEY_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`
}

/**
 * Decrypt a value stored as `v<version>:iv:authTag:ciphertext` (hex).
 */
export function decryptDocument(encrypted: string): string {
  const parts = encrypted.split(":")
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted document format")
  }
  const [versionStr, ivHex, tagHex, dataHex] = parts
  if (!versionStr || !ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted document format")
  }
  const version = parseInt(versionStr.replace("v", ""), 10)
  if (isNaN(version)) {
    throw new Error("Invalid encrypted document format")
  }
  // Only support the current key version; reject ciphertexts encrypted with
  // a different version to prevent ciphertext confusion attacks.
  if (version !== KEY_VERSION) {
    throw new Error("Unsupported encryption key version")
  }
  const key = getDocumentEncryptionKey()
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  decipher.setAAD(Buffer.from(`forgedocs-doc-v${KEY_VERSION}`, "utf8"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()])
  return decrypted.toString("utf8")
}

/**
 * Returns true when the stored value is in encrypted `v<version>:iv:tag:data` form.
 */
export function isEncryptedDocument(value: string | null): boolean {
  if (!value) return false
  const parts = value.split(":")
  return (
    parts.length === 4 &&
    /^v\d+$/.test(parts[0]) &&
    parts.slice(1).every((p) => /^[0-9a-f]+$/.test(p))
  )
}

/**
 * Constant-time comparison for encrypted integrity checks.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
