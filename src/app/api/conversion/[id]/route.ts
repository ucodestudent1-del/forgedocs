import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: job, error } = await supabase
    .from("conversion_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({ job })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitError = documentRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from("conversion_jobs")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}