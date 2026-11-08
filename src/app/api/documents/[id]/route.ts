import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*, templates ( * )")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  return NextResponse.json({ document: doc })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const csrfError = validateCSRF(req)
  if (csrfError) return csrfError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, is_pinned, is_archived } = body
  const { id } = await params

  const { data, error } = await (supabase as any)
    .from("documents")
    .update({ title, description, is_pinned, is_archived })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ document: data })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const csrfError = validateCSRF(req)
  if (csrfError) return csrfError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
