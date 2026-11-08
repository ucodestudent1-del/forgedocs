import { NextResponse } from "next/server"
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

  if (!token || !cookieToken || token !== cookieToken) {
    throw new CSRFError("Invalid CSRF token")
  }
}

export function generateCSRFToken() {
  return crypto.randomUUID()
}