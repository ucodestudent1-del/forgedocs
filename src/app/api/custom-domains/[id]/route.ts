import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

const verifySchema = z.object({})

// GET/PATCH/DELETE /api/custom-domains/[id]
export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { data: domain, error } = await supabase
    .from("custom_domains")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !domain) {
    throw createAppError("Custom domain not found", 404, "CUSTOM_DOMAIN_NOT_FOUND")
  }

  return NextResponse.json({ domain })
})

export const PATCH = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { data: domain } = await supabase
    .from("custom_domains")
    .select("hostname, dns_verified, verification_token")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!domain) {
    throw createAppError("Custom domain not found", 404, "CUSTOM_DOMAIN_NOT_FOUND")
  }

  // Verify DNS TXT record
  const dnsVerified = await verifyDnsTxt(domain.hostname, domain.verification_token || "")

  const { data, error } = await supabase
    .from("custom_domains")
    .update({
      dns_verified: dnsVerified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  await logAuditEvent({
    userId: user.id,
    action: "custom_domain.verify",
    entityType: "custom_domains",
    entityId: id,
    newValues: { dnsVerified },
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ domain: data, dnsVerified })
})

export const DELETE = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { error } = await supabase
    .from("custom_domains")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  await logAuditEvent({
    userId: user.id,
    action: "custom_domain.delete",
    entityType: "custom_domains",
    entityId: id,
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ success: true })
})

/**
 * Verify DNS TXT record for domain ownership.
 * Falls back gracefully when DNS lookup is unavailable.
 */
async function verifyDnsTxt(hostname: string, token: string): Promise<boolean> {
  try {
    const { resolveTxt } = await import("dns").then((m) => m.promises)
    const records = await resolveTxt(`_df-verification.${hostname}`)
    const expected = `forgedocs-domain-verification=${token}`
    return records.some((record) => record.includes(expected))
  } catch {
    // DNS unavailable or no records — not verified yet
    return false
  }
}
