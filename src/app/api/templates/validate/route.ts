import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const validateSchema = z.object({
  content: z.string(),
  placeholder_schema: z.array(z.object({
    name: z.string(),
    type: z.enum(["text", "date", "number", "select"]),
    default_value: z.unknown().optional(),
    required: z.boolean().default(false),
  })).default([]),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { content, placeholder_schema } = validateSchema.parse(body)

  // Find all [field_name] placeholders in content
  const placeholderRegex = /\[([^\]]+)\]/g
  const placeholdersInContent = [...content.matchAll(placeholderRegex)].map(m => m[1])

  // Find all placeholder names from schema
  const schemaPlaceholderNames = new Set(placeholder_schema.map(p => p.name))

  // Placeholders in content but not in schema
  const missingFromSchema = placeholdersInContent.filter(name => !schemaPlaceholderNames.has(name))

  // Placeholders in schema but not in content
  const missingFromContent = placeholder_schema.filter(p => !placeholdersInContent.includes(p.name))

  // Required placeholders missing values check (can't validate without values, but check schema consistency)
  const requiredMissingDefault = placeholder_schema.filter(p => p.required && p.default_value === undefined)

  const isValid = missingFromSchema.length === 0 && missingFromContent.length === 0

  const warnings = []
  if (missingFromSchema.length > 0) {
    warnings.push(`Placeholders found in content but not defined in schema: ${missingFromSchema.join(", ")}`)
  }
  if (missingFromContent.length > 0) {
    warnings.push(`Placeholders defined in schema but not found in content: ${missingFromContent.map(p => p.name).join(", ")}`)
  }
  if (requiredMissingDefault.length > 0) {
    warnings.push(`Required fields without default values: ${requiredMissingDefault.map(p => p.name).join(", ")}`)
  }

  return NextResponse.json({
    valid: isValid,
    placeholders_in_content: placeholdersInContent,
    placeholders_in_schema: placeholder_schema.map(p => p.name),
    missing_from_schema: missingFromSchema,
    missing_from_content: missingFromContent.map(p => p.name),
    required_without_default: requiredMissingDefault.map(p => p.name),
    warnings,
  })
})
