import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { content } = body

  const { id } = await params

  // Get current version
  const { data: currentDoc } = await supabase
    .from("documents")
    .select("version, content")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!currentDoc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // Create version snapshot
  await (supabase as any).from("document_versions").insert({
    document_id: id,
    version: (currentDoc as any).version,
    content: (currentDoc as any).content,
    created_by: user.id,
  })

  // Update document
  const { data, error } = await (supabase as any)
    .from("documents")
    .update({ content, version: (currentDoc as any).version + 1 })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ document: data })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: versions, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", id)
    .order("version", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions })
}
