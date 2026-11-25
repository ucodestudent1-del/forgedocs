import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary } from "@/lib/api-error"

const importDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  content: z.string().optional(),
  format: z.string().default("html"),
  template_id: z.string().uuid().optional().nullable(),
  is_template: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

const importSchema = z.object({
  documents: z.array(importDocumentSchema).default([]),
  templates: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.string().optional(),
    content: z.string(),
    fields: z.array(z.unknown()).default([]),
    is_public: z.boolean().default(false),
  })).default([]),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = importSchema.parse(await req.json())

  const results: Array<{ type: string; name?: string; title?: string; success: boolean; id?: string; error?: string }> = []

  for (const doc of body.documents) {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        title: doc.title,
        description: doc.description ?? null,
        content: doc.content ?? null,
        format: doc.format,
        template_id: doc.template_id ?? null,
        is_template: doc.is_template,
        tags: doc.tags,
        metadata: doc.metadata,
        status: "draft",
      })
      .select("id, title")
      .single()

    if (error) {
      results.push({ type: "document", title: doc.title, success: false, error: error.message })
    } else {
      results.push({ type: "document", id: data.id, title: data.title, success: true })
    }
  }

  for (const tmpl of body.templates) {
    const { data, error } = await supabase
      .from("templates")
      .insert({
        created_by: user.id,
        name: tmpl.name,
        description: tmpl.description ?? null,
        category: tmpl.category ?? null,
        content: tmpl.content,
        fields: tmpl.fields,
        is_public: tmpl.is_public,
      })
      .select("id, name")
      .single()

    if (error) {
      results.push({ type: "template", name: tmpl.name, success: false, error: error.message })
    } else {
      results.push({ type: "template", id: data.id, name: data.name, success: true })
    }
  }

  const failed = results.filter((r) => !r.success).length

  return NextResponse.json({
    imported: results.length - failed,
    failed,
    results,
  })
})
