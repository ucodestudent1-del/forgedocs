import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export function validateCSRF(req: Request) {
  const token = req.headers.get("x-csrf-token")
  const cookieToken = cookies().get("csrf_token")?.value

  if (!token || !cookieToken || token !== cookieToken) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
  }
  return null
}

export function generateCSRFToken() {
  return crypto.randomUUID()
}
