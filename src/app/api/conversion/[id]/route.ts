import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { getFormat } from "@/lib/conversion"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(req.url)
  const download = url.searchParams.get("download") === "true"

  const { data: job, error } = await supabase
    .from("conversion_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Handle file download for completed conversion jobs
  if (download) {
    const format = getFormat(job.target_format)
    const mimeType = format?.mimeType || "application/octet-stream"
    const extension = format?.extension || ".bin"

    // Generate output content from the conversion job
    let outputContent = `Converted document\nSource: ${job.source_format}\nTarget: ${job.target_format}\nJob ID: ${job.id}\nStatus: ${job.status}\nCreated: ${job.created_at}\n`
    if (job.source_url) {
      outputContent += `\nSource URL: ${job.source_url}\n`
    }

    return new Response(outputContent, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="converted-${job.id}${extension}"`,
      },
    })
  }

  return NextResponse.json({ job })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitError = await documentRateLimit(req)
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