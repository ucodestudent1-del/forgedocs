import { cookies } from "next/headers"
import { randomUUID, createHmac, timingSafeEqual } from "crypto"

const GUEST_SESSION_COOKIE = "guest_session_id"
const GUEST_USER_ID_COOKIE = "guest_user_id"

function getGuestSecret(): string | null {
  const secret = process.env.GUEST_SESSION_SECRET
  if (!secret && process.env.NEXT_PUBLIC_GUEST_MODE === "true") {
    throw new Error("GUEST_SESSION_SECRET is required when NEXT_PUBLIC_GUEST_MODE=true")
  }
  return secret ?? null
}

function signGuestId(id: string): string {
  const secret = getGuestSecret()
  if (!secret) return id
  const sig = createHmac("sha256", secret).update(id).digest("hex")
  return `${id}.${sig}`
}

function verifyGuestSignedId(signedId: string): string | null {
  const secret = getGuestSecret()
  if (!secret) return null
  const parts = signedId.split(".")
  if (parts.length !== 2) return null
  const [id, sig] = parts
  const expected = createHmac("sha256", secret).update(id).digest("hex")
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return id
}

export function isGuestMode(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODE === "true"
}

export async function getGuestUserId(): Promise<string> {
  const cookieStore = await cookies()
  const existingId = cookieStore.get(GUEST_USER_ID_COOKIE)?.value
  if (existingId) {
    const verified = verifyGuestSignedId(existingId)
    if (verified) return verified
  }
  const id = randomUUID()
  const signed = signGuestId(id)
  try {
    cookieStore.set(GUEST_USER_ID_COOKIE, signed, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours
    })
  } catch {
    // set() called during render; cookie applied on next response
  }
  return id
}

export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value

  if (!sessionId) {
    sessionId = randomUUID()
    try {
    cookieStore.set(GUEST_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
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
        secure: true,
        sameSite: "strict",
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
