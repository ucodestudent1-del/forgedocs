import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const importSchema = z.object({
  templates: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.string().optional(),
    content: z.string(),
    placeholder_schema: z.array(z.object({
      name: z.string(),
      type: z.enum(["text", "date", "number", "select"]),
      default_value: z.unknown().optional(),
      required: z.boolean().default(false),
    })).default([]),
    preview_url: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    is_public: z.boolean().default(false),
  })),
})

const exportSchema = z.object({
  template_ids: z.array(z.string().uuid()).optional(),
  include_public: z.boolean().default(false),
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

  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  if (action === "import") {
    const body = await req.json()
    const { templates } = importSchema.parse(body)

    const results = []
    for (const tmpl of templates) {
      const { data, error } = await supabase
        .from("templates")
        .insert({
          user_id: user.id,
          ...tmpl,
          usage_count: 0,
        })
        .select()
        .single()

      if (error) {
        results.push({ name: tmpl.name, error: error.message })
      } else {
        results.push({ name: tmpl.name, id: data.id, success: true })
      }
    }

    return NextResponse.json({ imported: results.length, results })
  }

  if (action === "export") {
    const body = await req.json()
    const { template_ids, include_public } = exportSchema.parse(body)

    let query = supabase
      .from("templates")
      .select("name, description, category, content, placeholder_schema, preview_url, tags, is_public")
      .eq("user_id", user.id)

    if (template_ids) {
      query = query.in("id", template_ids)
    }

    if (include_public) {
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`)
    }

    const { data: templates, error } = await query.order("created_at", { ascending: false })

    if (error) {
      throw createAppError(error.message, 500, "DATABASE_ERROR")
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      template_count: templates.length,
      templates,
    }

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="forgedocs-templates-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  }

  return NextResponse.json({ error: "Invalid action. Use ?action=import or ?action=export" }, { status: 400 })
})
