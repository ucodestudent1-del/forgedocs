import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { sanitizeHtml } from "@/lib/sanitize"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: doc, error } = await supabase
    .from("documents")
    .select("content, title, version")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  return NextResponse.json({ document: { ...doc, content: sanitizeHtml(doc.content || "") } })
}

const updateContentSchema = z.object({
  content: z.string().max(1000000),
  expected_version: z.number().int().nonnegative().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const rateLimitError = await documentRateLimit(req)
    if (rateLimitError) return rateLimitError

    try {
      await validateCSRF(req)
    } catch (error) {
      if (error instanceof Error && error.name === "CSRFError") {
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
      }
      throw error
    }

    const supabase = await getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { content, expected_version } = updateContentSchema.parse(body)
    const sanitizedContent = sanitizeHtml(content)

    const { id } = await params

    const { data: currentDoc } = await supabase
      .from("documents")
      .select("version, content")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (!currentDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Optimistic locking: reject if expected_version provided and doesn't match
    if (expected_version !== undefined && currentDoc.version !== expected_version) {
      return NextResponse.json(
        { error: "Document has been modified by another user. Please reload and try again." },
        { status: 409 }
      )
    }

    await (supabase as any).from("document_versions").insert({
      document_id: id,
      version: (currentDoc as any).version,
      content: (currentDoc as any).content,
      created_by: user.id,
    })

    const { data, error } = await (supabase as any)
      .from("documents")
      .update({ content: sanitizedContent, version: (currentDoc as any).version + 1 })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("version", (currentDoc as any).version)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Document has been modified by another user. Please reload and try again." },
        { status: 409 }
      )
    }

    return NextResponse.json({ document: data })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}