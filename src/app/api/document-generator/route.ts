export const dynamic = "force-dynamic"

import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

export async function GET(req: Request) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*, templates ( id, name, category )")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: documents || [] })
}

export async function POST(req: Request) {
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
  const { document_id, template_id, template_data } = body

  if (!document_id && !template_id) {
    return NextResponse.json({ error: "Either document_id or template_id is required" }, { status: 400 })
  }

  if (document_id) {
    // Generate document from existing document
    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", user.id)
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({
      document_id: doc.id,
      title: doc.title,
      content: doc.content,
      version: doc.version,
      created_at: doc.created_at
    })
  }

  if (template_id) {
    // Generate document from template
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Apply template data to template content
    let content = template.content || ""
    Object.entries(template_data || {}).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), String(value))
    })

    const storagePath = `documents/${user.id}/${crypto.randomUUID()}.json`

    const { data: doc, error } = await (supabase as any)
      .from("documents")
      .insert({
        user_id: user.id,
        title: template.name,
        content: content,
        storage_path: storagePath,
        mime_type: "application/vnd.forgedocs.document+json",
        file_size: Buffer.byteLength(content),
        version: 1,
        template_id: template_id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ document: doc }, { status: 201 })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}
