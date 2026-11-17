import { randomUUID, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export class CSRFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CSRFError"
  }
}

export async function validateCSRF(req: Request): Promise<void> {
  const token = req.headers.get("x-csrf-token")
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get("csrf_token")?.value

  if (!token || !cookieToken) {
    throw new CSRFError("Invalid CSRF token")
  }

  if (token.length !== cookieToken.length) {
    throw new CSRFError("Invalid CSRF token")
  }

  if (!timingSafeEqual(Buffer.from(token), Buffer.from(cookieToken))) {
    throw new CSRFError("Invalid CSRF token")
  }
}

export function generateCSRFToken() {
  return randomUUID()
}
