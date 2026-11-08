export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function rateLimit(identifier: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}

const auditSchema = z.object({
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export async function POST(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 100 requests per minute per user
  const limit = rateLimit(`audit:${user.id}`, 100, 60000)
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const body = await req.json()
  const { action, entityType, entityId, metadata } = auditSchema.parse(body)

  const { error } = await (supabase as any).from("audit_logs").insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url).searchParams
  const limit = parseInt(searchParams.get("limit") || "50")

  const { data: logs, error } = await (supabase as any)
    .from("audit_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs })
}

