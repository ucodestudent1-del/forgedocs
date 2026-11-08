import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: versions, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", id)
    .eq("user_id", user.id)
    .order("version", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { content } = body

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

  await (supabase as any).from("document_versions").insert({
    document_id: id,
    version: (currentDoc as any).version,
    content: (currentDoc as any).content,
    created_by: user.id,
  })

  const { data, error } = await (supabase as any)
    .from("documents")
    .update({ content, version: (currentDoc as any).version + 1 })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ document: data })
}
