import { cookies } from "next/headers"

const GUEST_SESSION_COOKIE = "guest_session_id"
const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000"

export function isGuestMode(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODE === "true"
}

export function getGuestUserId(): string {
  return GUEST_USER_ID
}

export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
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

  return sessionId
}

export function getGuestSessionCookieName(): string {
  return GUEST_SESSION_COOKIE
}
