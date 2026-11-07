import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates })
}

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  source_url: z.string(),
  placeholder_schema: z.array(z.object({
    name: z.string(),
    type: z.enum(["text", "date", "number", "select"]),
    default_value: z.unknown().optional(),
    required: z.boolean().default(false),
  })).default([]),
  preview_url: z.string().optional(),
  tags: z.array(z.string()).default([]),
  is_public: z.boolean().default(false),
})

export async function POST(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, category, source_url, placeholder_schema, preview_url, tags, is_public } = createTemplateSchema.parse(body)

  const { data, error } = await (supabase as any)
    .from("templates")
    .insert({
      user_id: user.id,
      name,
      description,
      category,
      source_url,
      placeholder_schema,
      preview_url,
      tags,
      is_public,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data }, { status: 201 })
}

