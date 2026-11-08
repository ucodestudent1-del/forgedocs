import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: doc, error } = await supabase
    .from("documents")
    .select("content, title, mime_type, version")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // Sanitize filename to prevent header injection
  const safeTitle = (doc.title || "document").replace(/["\r\n]/g, "_").slice(0, 100)

  // Return document content
  return new Response(doc.content, {
    headers: {
      "Content-Type": doc.mime_type || "text/plain",
      "Content-Disposition": `attachment; filename="${safeTitle}.txt"`,
    },
  })
}
