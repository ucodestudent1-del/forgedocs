import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib"
import QRCode from "qrcode"
import { randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from "crypto"

export const MFA_ISSUER = "ForgeDocs"

const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

function getEncryptionKey(): Buffer {
  const raw = process.env.MFA_SECRET_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("MFA_SECRET_ENCRYPTION_KEY is not configured")
  }
  return createHash("sha256").update(raw).digest()
}

/**
 * Encrypt an MFA TOTP secret at rest using AES-256-GCM.
 * Returns `iv:authTag:ciphertext` (all hex).
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`
}

/**
 * Decrypt an MFA TOTP secret stored as `iv:authTag:ciphertext` (hex).
 * Falls back to returning the value unchanged when it is not in encrypted format
 * (plaintext secrets from before encryption was introduced).
 */
export function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivHex, tagHex, dataHex] = ciphertext.split(":")
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted secret format")
  }
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()])
  return decrypted.toString("utf8")
}

/**
 * Returns true when the stored value is in encrypted `iv:tag:data` form.
 */
export function isEncryptedSecret(value: string | null): boolean {
  if (!value) return false
  const parts = value.split(":")
  return (
    parts.length === 3 &&
    parts.every((p) => /^[0-9a-f]+$/.test(p))
  )
}

/**
 * Resolve the active TOTP secret from a stored profile value, decrypting when needed.
 * Plaintext (legacy) values are returned as-is for backward compatibility.
 */
export function resolveStoredSecret(stored: string | null): string | null {
  if (!stored) return null
  if (isEncryptedSecret(stored)) {
    try {
      return decryptSecret(stored)
    } catch {
      return null
    }
  }
  return stored
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
  return createHash("sha256").update(code).digest("hex")
}

export function verifyBackupCode(hashedCode: string, providedCode: string): boolean {
  const providedHash = hashBackupCode(providedCode)
  if (providedHash.length !== hashedCode.length) return false
  return timingSafeEqual(Buffer.from(providedHash), Buffer.from(hashedCode))
}