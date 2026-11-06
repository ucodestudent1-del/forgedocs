import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const generateSchema = z.object({
  values: z.record(z.string(), z.unknown()),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Fetch template
  const { data: template, error: templateError } = await (supabase as any)
    .from("templates")
    .select("*")
    .eq("id", id)
    .single()

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  const body = await req.json()
  const { values } = generateSchema.parse(body)

  const placeholderSchema = template.placeholder_schema || []

  // Validate required placeholders
  const required = placeholderSchema.filter((p: any) => p.required)
  for (const field of required) {
    if (!(field.name in values) || values[field.name] === "" || values[field.name] == null) {
      return NextResponse.json(
        { error: `Missing required field: ${field.name}` },
        { status: 400 }
      )
    }
  }

  // Render placeholder content (simple string replacement)
  let renderedContent = ""
  const placeholders: any[] = []

  for (const field of placeholderSchema) {
    const value = values[field.name] ?? field.default_value ?? ""
    placeholders.push({ name: field.name, value, type: field.type })
  }

  // Build document content JSON (Lexical/TipTap format)
  const documentContent = {
    type: "doc",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", text: `Generated from template: ${template.name}` },
        ],
      },
      ...placeholders.map((p: any) => ({
        type: "paragraph",
        children: [
          { type: "text", text: `${p.name}: `, bold: true },
          { type: "text", text: String(p.value) },
        ],
      })),
    ],
  }

  const storagePath = `documents/${user.id}/${crypto.randomUUID()}.json`

  const { data: doc, error } = await (supabase as any)
    .from("documents")
    .insert({
      user_id: user.id,
      template_id: id,
      title: `Generated: ${template.name}`,
      description: `Generated from template on ${new Date().toISOString()}`,
      content: documentContent,
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

  // Track usage
  await (supabase as any).from("usage_records").insert({
    user_id: user.id,
    metric: "documents_created",
    quantity: 1,
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}
