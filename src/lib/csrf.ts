import { randomUUID, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export class CSRFError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number = 400, code: string = "CSRF_ERROR") {
    super(message)
    this.name = "CSRFError"
    this.statusCode = statusCode
    this.code = code
  }
}

export async function validateCSRF(req: Request): Promise<void> {
  const token = req.headers.get("x-csrf-token")
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get("csrf_token")?.value

  if (!token || !cookieToken) {
    throw new CSRFError("Invalid CSRF token")
  }

  // Use constant-time comparison. timingSafeEqual throws if buffer lengths
  // differ; catch and reject without leaking length information.
  try {
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(cookieToken))) {
      throw new CSRFError("Invalid CSRF token")
    }
  } catch {
    throw new CSRFError("Invalid CSRF token")
  }
}

export function generateCSRFToken() {
  return randomUUID()
}
