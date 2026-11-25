import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib"
import QRCode from "qrcode"
import { randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv, createHmac } from "crypto"

export const MFA_ISSUER = "ForgeDocs"

export class MFAError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = "MFAError"
  }
}

export class DecryptionError extends MFAError {
  constructor(reason: "wrong_key" | "corrupt_data" | "tampered") {
    super(reason, `Decryption failed: ${reason}`)
    this.code = `MFA_DECRYPT_${reason.toUpperCase()}`
  }
}

const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const CURRENT_KEY_VERSION = 1

function getEncryptionKey(version: number): Buffer {
  const envVar = version === 1 ? "MFA_SECRET_ENCRYPTION_KEY" : `MFA_SECRET_ENCRYPTION_KEY_V${version}`
  const raw = process.env[envVar]
  if (!raw) {
    throw new Error(`${envVar} is not configured`)
  }
  return createHash("sha256").update(raw).digest()
}

/**
 * Encrypt an MFA TOTP secret at rest using AES-256-GCM.
 * Returns `v<version>:iv:authTag:ciphertext` (all hex).
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey(CURRENT_KEY_VERSION)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `v${CURRENT_KEY_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`
}

/**
 * Decrypt an MFA TOTP secret stored as `v<version>:iv:authTag:ciphertext` (hex).
 * Tries all configured encryption key versions to support key rotation.
 * Falls back to returning the value unchanged when it is not in encrypted format
 * (plaintext secrets from before encryption was introduced).
 */
export function decryptSecret(ciphertext: string): string | null {
  const [versionStr, ivHex, tagHex, dataHex] = ciphertext.split(":")
  if (!versionStr || !ivHex || !tagHex || !dataHex) {
    throw new DecryptionError("corrupt_data")
  }

  const version = parseInt(versionStr.replace("v", ""), 10)
  if (isNaN(version)) {
    throw new DecryptionError("corrupt_data")
  }

  // Try the key version that encrypted the data, plus fallback versions
  const versionsToTry = [version, CURRENT_KEY_VERSION].filter((v, i, arr) => arr.indexOf(v) === i)

  let lastError: Error | null = null

  for (const v of versionsToTry) {
    try {
      const key = getEncryptionKey(v)
      const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(ivHex, "hex"))
      decipher.setAuthTag(Buffer.from(tagHex, "hex"))
      const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()])
      return decrypted.toString("utf8")
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      continue
    }
  }

  throw new DecryptionError("wrong_key")
}

/**
 * Returns true when the stored value is in encrypted `v<version>:iv:tag:data` form.
 */
export function isEncryptedSecret(value: string | null): boolean {
  if (!value) return false
  const parts = value.split(":")
  return (
    parts.length === 4 &&
    /^v\d+$/.test(parts[0]) &&
    parts.slice(1).every((p) => /^[0-9a-f]+$/.test(p))
  )
}

/**
 * Resolve the active TOTP secret from a stored profile value, decrypting when needed.
 * Plaintext (legacy) values are returned as-is for backward compatibility.
 */
export function resolveStoredSecret(stored: string | null): string | null {
  if (!stored) return null
  if (isEncryptedSecret(stored)) {
    return decryptSecret(stored)
  }
  return stored
}

/**
 * Re-encrypt a secret using the current key version. Use this during key rotation
 * to migrate existing secrets to a new encryption key.
 */
export function reEncryptSecret(encryptedValue: string): string | null {
  const decrypted = decryptSecret(encryptedValue)
  if (!decrypted) return null
  return encryptSecret(decrypted)
}

export function generateSecret(): string {
  return otpGenerateSecret()
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(4).toString("hex").toUpperCase())
  }
  return codes
}

export function getTotpUri(secret: string, email: string): string {
  return generateURI({ issuer: MFA_ISSUER, label: email, secret })
}

export async function generateQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 200,
    margin: 2,
    color: { dark: "#1f2937", light: "#ffffff" },
  })
}

export function verifyToken(secret: string, token: string): boolean {
  try {
    const result = verifySync({ token, secret })
    return result.valid === true
  } catch {
    return false
  }
}

export function hashBackupCode(code: string): string {
  const pepper = process.env.MFA_BACKUP_CODE_PEPPER
  if (!pepper) {
    throw new Error("MFA_BACKUP_CODE_PEPPER is not configured")
  }
  return createHmac("sha256", pepper).update(code).digest("hex")
}

export function verifyBackupCode(hashedCode: string, providedCode: string): boolean {
  const pepper = process.env.MFA_BACKUP_CODE_PEPPER
  if (!pepper) {
    throw new Error("MFA_BACKUP_CODE_PEPPER is not configured")
  }
  const providedHash = hashBackupCode(providedCode)
  // Always run timingSafeEqual without early length return to avoid
  // length-based timing side channels.
  return timingSafeEqual(Buffer.from(providedHash), Buffer.from(hashedCode))
}