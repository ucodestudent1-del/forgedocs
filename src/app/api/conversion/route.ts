import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const supportedFormats = [
  { source: "docx", targets: ["pdf", "txt", "html"] },
  { source: "pdf", targets: ["docx", "txt"] },
  { source: "xlsx", targets: ["csv", "pdf"] },
  { source: "csv", targets: ["xlsx", "pdf"] },
  { source: "pptx", targets: ["pdf"] },
]

const VALID_FORMATS = ["pdf", "docx", "xlsx", "csv", "pptx", "txt", "html"]

const createJobSchema = z.object({
  source_document_id: z.string().uuid().optional(),
  source_url: z.string().url().optional(),
  target_format: z.string().refine((f) => VALID_FORMATS.includes(f), {
    message: "Unsupported target format",
  }),
})

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const { searchParams } = url
  const formats = searchParams.get("formats")

  if (formats === "true") {
    return NextResponse.json({ formats: supportedFormats })
  }

  const { page, limit, offset } = parsePagination(searchParams)

  const { data: jobs, error, count } = await (supabase as any)
    .from("conversion_jobs")
    .select("*, source_document:documents(title)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    jobs: jobs || [],
    count: count ?? 0,
    page,
    limit,
  })
}

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const csrfError = validateCSRF(req)
  if (csrfError) return csrfError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { source_document_id, source_url, target_format } = createJobSchema.parse(body)

  // Verify source document exists and belongs to user
  if (source_document_id) {
    const { data: sourceDoc, error: docError } = await supabase
      .from("documents")
      .select("id, storage_path, mime_type")
      .eq("id", source_document_id)
      .eq("user_id", user.id)
      .single()

    if (docError || !sourceDoc) {
      return NextResponse.json({ error: "Source document not found" }, { status: 404 })
    }
  }

  // Check tier limits
  const { data: subscription } = await (supabase as any)
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  const tier = subscription?.tier || "free"
  const tierLimits = {
    free: { daily_conversions: 5 },
    pro: { daily_conversions: 100 },
    business: { daily_conversions: 1000 },
    enterprise: { daily_conversions: -1 },
  }

  const limit = tierLimits[tier as keyof typeof tierLimits]?.daily_conversions || 5
  if (limit >= 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await (supabase as any)
      .from("conversion_jobs")
      .select("*", { head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())

    if (count >= limit) {
      return NextResponse.json(
        { error: `Daily conversion limit (${limit}) reached for ${tier} tier` },
        { status: 403 }
      )
    }
  }

  const { data: job, error } = await (supabase as any)
    .from("conversion_jobs")
    .insert({
      user_id: user.id,
      source_document_id,
      source_url,
      target_format,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Track usage
  await (supabase as any).from("usage_records").insert({
    user_id: user.id,
    metric: "conversions",
    quantity: 1,
  })

  return NextResponse.json({ job }, { status: 201 })
}