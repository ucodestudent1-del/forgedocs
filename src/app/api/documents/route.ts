export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET(req: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const archived = searchParams.get("archived") === "true"
  const pinned = searchParams.get("pinned") === "true"
  const search = searchParams.get("search") || ""

  let query = supabase
    .from("documents")
    .select(`
      *,
      templates ( id, name, category )
    `)
    .eq("user_id", user.id)
    .eq("is_archived", archived)

  if (pinned) {
    query = query.eq("is_pinned", true)
  }

  if (search) {
    query = query.ilike("title", `%${search}%`)
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data, count, page, limit })
}

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  template_id: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, template_id } = createDocSchema.parse(body)

  const storagePath = `documents/${user.id}/${crypto.randomUUID()}.json`

  const { data: doc, error } = await (supabase as any)
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      description,
      content: null,
      storage_path: storagePath,
      mime_type: "application/vnd.forgedocs.document+json",
      file_size: 0,
      version: 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ document: doc }, { status: 201 })
}
