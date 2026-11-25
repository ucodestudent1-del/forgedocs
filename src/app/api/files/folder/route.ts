import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Check document limit (folders count as documents)
  const limitCheck = await checkTierLimit(user.id, "documents_created", 1)
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.` },
      { status: 403 }
    )
  }

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
      throw createAppError("Parent folder not found", 404, "PARENT_FOLDER_NOT_FOUND")
    }
  }

  // Create folder as a document with special mime type
  const { data: folder, error } = await supabase
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
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Track usage
  await trackUsage(user.id, "documents_created", 1)

  return NextResponse.json({ file: folder }, { status: 201 })
})
