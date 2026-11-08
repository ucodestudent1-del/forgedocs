export const dynamic = "force-dynamic"

import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const generateSchema = z.object({
  document_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  template_data: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(req: Request) {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
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
  const { document_id, template_id, template_data } = generateSchema.parse(body)

  if (!document_id && !template_id) {
    return NextResponse.json({ error: "Either document_id or template_id is required" }, { status: 400 })
  }

  if (document_id) {
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
      created_at: doc.created_at,
    })
  }

  if (template_id) {
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", template_id)
      .eq("user_id", user.id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Apply template data to template content with ReDoS protection
    let content = template.content || ""
    const templateData = template_data || {}
    const keys = Object.keys(templateData)

    // Escape regex special characters in keys to prevent ReDoS
    const escapedKeys = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const value = String(templateData[key] ?? "")
      content = content.replace(new RegExp(`\\[${escapedKeys[i]}\\]`, "g"), value)
    }

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
        template_id: template_id,
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
