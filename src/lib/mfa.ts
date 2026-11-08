import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib"
import QRCode from "qrcode"
import { randomBytes } from "crypto"

export const MFA_ISSUER = "ForgeDocs"

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
  return Buffer.from(code).toString("base64")
}

export function verifyBackupCode(hashedCode: string, providedCode: string): boolean {
  return hashBackupCode(providedCode) === hashedCode
}