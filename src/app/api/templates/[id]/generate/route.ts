import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

const generateSchema = z.object({
  values: z.record(z.string(), z.unknown()),
})

export const POST = withErrorBoundary(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single()

  if (templateError || !template) {
    throw createAppError("Template not found", 404, "NOT_FOUND")
  }

  const body = await req.json()
  const { values } = generateSchema.parse(body)

  const placeholderSchema = template.placeholder_schema || []

  // Validate required placeholders
  const required = placeholderSchema.filter((p: any) => p.required)
  for (const field of required) {
    if (!(field.name in values) || values[field.name] === "" || values[field.name] == null) {
      throw createAppError(`Missing required field: ${field.name}`, 400, "MISSING_FIELD")
    }
  }

  // Apply placeholder substitution to template content with ReDoS protection
  let content = template.content || ""
  const keys = Object.keys(values)

  // Escape regex special characters in keys to prevent ReDoS
  const escapedKeys = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = String(values[key] ?? "")
    content = content.replace(new RegExp(`\\[${escapedKeys[i]}\\]`, "g"), value)
  }

  // Also apply defaults for any remaining unreplaced placeholders from schema
  for (const field of placeholderSchema) {
    if (!values[field.name] && field.default_value !== undefined) {
      content = content.replace(new RegExp(`\\[${field.name}\\]`, "g"), String(field.default_value))
    }
  }

  const storagePath = `documents/${user.id}/${randomUUID()}.json`

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      template_id: id,
      title: `Generated: ${template.name}`,
      description: `Generated from template on ${new Date().toISOString()}`,
      content,
      storage_path: storagePath,
      mime_type: "application/vnd.forgedocs.document+json",
      file_size: Buffer.byteLength(content),
      version: 1,
    })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Track usage - increment template usage_count
  await supabase.from("templates").update({ usage_count: (template.usage_count ?? 0) + 1 }).eq("id", id)

  // Track usage record
  await supabase.from("usage_records").insert({
    user_id: user.id,
    metric: "documents_created",
    quantity: 1,
  })

  return NextResponse.json({ document: doc }, { status: 201 })
})
