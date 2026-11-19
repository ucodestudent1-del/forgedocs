import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { randomUUID } from "crypto"

const bulkGenerateSchema = z.object({
  template_id: z.string().uuid(),
  batches: z.array(
    z.object({
      values: z.record(z.string(), z.unknown()),
      title: z.string().optional(),
    })
  ).min(1).max(50),
})

export const dynamic = "force-dynamic"

export const POST = withErrorBoundary(async (
  req: Request,
) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { template_id, batches } = bulkGenerateSchema.parse(body)

  // Check tier limit for bulk generation
  const limitCheck = await (supabase as any)
    .rpc("check_tier_limit", { p_user_id: user.id, p_metric: "documents_created", p_quantity: batches.length })

  if (!limitCheck.data?.allowed) {
    return NextResponse.json(
      { error: `Bulk generation exceeds document limit. Requested: ${batches.length}`, limit_exceeded: true },
      { status: 403 }
    )
  }

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", template_id)
    .single()

  if (templateError || !template) {
    throw createAppError("Template not found", 404, "NOT_FOUND")
  }

  const placeholderSchema = template.placeholder_schema || []
  const results = []
  const errors = []

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const values = batch.values

    // Validate required placeholders
    const required = placeholderSchema.filter((p: any) => p.required)
    let missingRequired = false
    for (const field of required) {
      if (!(field.name in values) || values[field.name] === "" || values[field.name] == null) {
        errors.push({ batch_index: i, error: `Missing required field: ${field.name}` })
        missingRequired = true
        break
      }
    }

    if (missingRequired) continue

    // Apply placeholder substitution
    let content = template.content || ""
    const keys = Object.keys(values)
    const escapedKeys = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]
      const value = String(values[key] ?? "")
      content = content.replace(new RegExp(`\\[${escapedKeys[j]}\\]`, "g"), value)
    }

    // Apply defaults
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
        template_id,
        title: batch.title || `Generated: ${template.name} (${i + 1})`,
        description: `Bulk generated from template on ${new Date().toISOString()}`,
        content,
        storage_path: storagePath,
        mime_type: "application/vnd.forgedocs.document+json",
        file_size: Buffer.byteLength(content),
        version: 1,
      })
      .select()
      .single()

    if (error) {
      errors.push({ batch_index: i, error: error.message })
    } else {
      results.push({ batch_index: i, document_id: doc.id, title: doc.title })
    }
  }

  // Track usage
  await supabase.from("templates").update({ usage_count: (template.usage_count ?? 0) + results.length }).eq("id", template_id)
  await supabase.from("usage_records").insert({
    user_id: user.id,
    metric: "documents_created",
    quantity: results.length,
  })

  return NextResponse.json({
    template_id,
    template_name: template.name,
    total_requested: batches.length,
    total_generated: results.length,
    total_failed: errors.length,
    results,
    errors,
  }, { status: results.length > 0 ? 201 : 400 })
})
