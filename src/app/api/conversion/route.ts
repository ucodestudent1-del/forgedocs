export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

const supportedFormats = [
  { source: "docx", targets: ["pdf", "txt", "html"] },
  { source: "pdf", targets: ["docx", "txt"] },
  { source: "xlsx", targets: ["csv", "pdf"] },
  { source: "csv", targets: ["xlsx", "pdf"] },
  { source: "pptx", targets: ["pdf"] },
]

const VALID_FORMATS = ["pdf", "docx", "xlsx", "csv", "pptx", "txt", "html"]

export async function GET(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url).searchParams
  const formats = searchParams.get("formats")

  if (formats === "true") {
    return NextResponse.json({ formats: supportedFormats })
  }

  const { data: jobs, error } = await (supabase as any)
    .from("conversion_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ jobs })
}

const createJobSchema = z.object({
  source_document_id: z.string().uuid().optional(),
  source_url: z.string(),
  target_format: z.string().refine((f) => VALID_FORMATS.includes(f), {
    message: "Unsupported target format",
  }),
})

export async function POST(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { source_document_id, source_url, target_format } = createJobSchema.parse(body)

  // Check tier limits
  const { data: subscription } = await (supabase as any)
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
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

