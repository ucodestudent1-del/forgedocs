import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"
import { z } from "zod"

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  try {
    await validateCSRF(req)
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check document limit (folders count as documents)
  const limitCheck = await checkTierLimit(user.id, "documents_created", 1)
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.` },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { name, parent_id } = createFolderSchema.parse(body)

    // Verify parent folder exists and belongs to user
    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from("documents")
        .select("id")
        .eq("id", parent_id)
        .eq("user_id", user.id)
        .single()

      if (parentError || !parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 })
      }
    }

    // Create folder as a document with special mime type
    const { data: folder, error } = await (supabase as any)
      .from("documents")
      .insert({
        user_id: user.id,
        parent_id: parent_id || null,
        title: name,
        storage_path: `folders/${user.id}/${crypto.randomUUID()}`,
        mime_type: "application/vnd.forgedocs.folder",
        file_size: 0,
        version: 1,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Track usage
    await trackUsage(user.id, "documents_created", 1)

    return NextResponse.json({ file: folder }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 })
    }
    console.error("Folder creation error:", error)
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
  }
}