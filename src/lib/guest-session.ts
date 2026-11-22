import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const GUEST_SESSION_COOKIE = "guest_session_id"
const GUEST_USER_ID_COOKIE = "guest_user_id"

export function isGuestMode(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODE === "true"
}

export async function getGuestUserId(): Promise<string> {
  const cookieStore = await cookies()
  const existingId = cookieStore.get(GUEST_USER_ID_COOKIE)?.value
  if (existingId) {
    return existingId
  }
  // Fallback: generate a new ID (won't be persisted if cookies can't be set)
  return randomUUID()
}

export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value

  if (!sessionId) {
    sessionId = randomUUID()
    try {
      cookieStore.set(GUEST_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2, // 2 hours
      })
    } catch {
      // set() called during render; cookie applied on next response
    }
  }

  // Ensure a unique guest user ID exists for this session
  let userId = cookieStore.get(GUEST_USER_ID_COOKIE)?.value
  if (!userId) {
    userId = randomUUID()
    try {
      cookieStore.set(GUEST_USER_ID_COOKIE, userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2, // 2 hours
      })
    } catch {
      // set() called during render; cookie applied on next response
    }
  }

  return sessionId
}

export function getGuestSessionCookieName(): string {
  return GUEST_SESSION_COOKIE
}
