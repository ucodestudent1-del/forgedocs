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

function deriveGuestUserId(sessionId: string): string {
  const secret = getGuestSecret()
  if (!secret) return sessionId
  return createHmac("sha256", secret).update(`guest-user:${sessionId}`).digest("hex")
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

  // Derive from session cookie if available, otherwise create new
  const sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value
  if (sessionId) {
    const verifiedSession = verifyGuestSignedId(sessionId)
    if (verifiedSession) {
      const userId = deriveGuestUserId(verifiedSession)
      const signed = signGuestId(userId)
      cookieStore.set(GUEST_USER_ID_COOKIE, signed, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 2,
      })
      return userId
    }
  }

  const id = randomUUID()
  const signed = signGuestId(id)
  cookieStore.set(GUEST_USER_ID_COOKIE, signed, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 2,
  })
  return id
}

export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value

  if (!sessionId) {
    sessionId = randomUUID()
    cookieStore.set(GUEST_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 2,
    })
  }

  // Cryptographically bind guest user ID to session ID
  const verifiedSession = verifyGuestSignedId(sessionId ?? "")
  const effectiveSessionId = verifiedSession ?? sessionId
  let userId = cookieStore.get(GUEST_USER_ID_COOKIE)?.value
  if (!userId) {
    userId = deriveGuestUserId(effectiveSessionId)
    cookieStore.set(GUEST_USER_ID_COOKIE, signGuestId(userId), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 2,
    })
  }

  return effectiveSessionId
}

export function getGuestSessionCookieName(): string {
  return GUEST_SESSION_COOKIE
}
