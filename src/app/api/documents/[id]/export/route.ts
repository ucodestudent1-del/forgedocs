import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // For converted documents, we serve from storage or regenerate
  // For now, return a redirect to the document editor
  return NextResponse.json({
    download_url: `/editor?id=${id}`,
    message: "Use the editor to view and export documents",
  })
}
