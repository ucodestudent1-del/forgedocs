import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

const domainSchema = z.object({
  hostname: z.string().min(1).max(253),
})

// GET /api/custom-domains - list user's custom domains
export const GET = withErrorBoundary(async (req) => {
  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { data: domains, error } = await supabase
    .from("custom_domains")
    .select("id, hostname, dns_verified, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ domains: domains ?? [] })
})

// POST /api/custom-domains - register a custom domain
export const POST = withErrorBoundary(async (req) => {
  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { hostname } = domainSchema.parse(body)

  const verificationToken = require("crypto").randomBytes(32).toString("hex")

  const { data, error } = await supabase
    .from("custom_domains")
    .insert({
      user_id: user.id,
      hostname: hostname.toLowerCase(),
      dns_verified: false,
      verification_token: verificationToken,
    })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Audit log
  await logAuditEvent({
    userId: user.id,
    action: "custom_domain.register",
    entityType: "custom_domains",
    entityId: data.id,
    newValues: { hostname },
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({
    domain: data,
    verification_token: verificationToken,
    verification_instructions: {
      type: "TXT",
      name: `@.${hostname}`,
      value: `forgedocs-domain-verification=${verificationToken}`,
    },
  }, { status: 201 })
})
