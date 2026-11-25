export const dynamic = "force-dynamic"

import crypto from "crypto"
import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const generateSchema = z.object({
  document_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  template_data: z.record(z.string(), z.unknown()).optional(),
})

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*, templates ( id, name, category )")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ documents: documents || [] })
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
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
      throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
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
      throw createAppError("Template not found", 404, "TEMPLATE_NOT_FOUND")
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

    const { data: doc, error } = await supabase
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
      throw createAppError(error.message, 500, "DATABASE_ERROR")
    }

    return NextResponse.json({ document: doc }, { status: 201 })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
})
