import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { trackUsage } from "@/lib/tierLimits"
import logger from "@/lib/logger"

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { action, ids } = body

  if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Invalid request: action and ids[] required" }, { status: 400 })
  }

  const validActions = ["delete", "move", "export", "share", "archive", "unarchive", "pin", "unpin"]
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Valid: ${validActions.join(", ")}` }, { status: 400 })
  }

  // Verify all documents belong to user
  const { data: docs, error: fetchError } = await supabase
    .from("documents")
    .select("id, title, storage_path, file_size, user_id")
    .in("id", ids)
    .eq("user_id", user.id)

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }

  if (!docs || docs.length !== ids.length) {
    return NextResponse.json({ error: "Some documents not found or access denied" }, { status: 403 })
  }

  const results = []
  let totalStorageFreed = 0

  for (const doc of docs) {
    try {
      let result: any = { id: doc.id, success: false }

      switch (action) {
        case "delete": {
          // Delete from storage
          if (doc.storage_path) {
            await supabase.storage.from("documents").remove([doc.storage_path])
          }
          // Delete from database
          const { error: deleteError } = await supabase
            .from("documents")
            .delete()
            .eq("id", doc.id)
            .eq("user_id", user.id)

          if (deleteError) throw deleteError
          totalStorageFreed += doc.file_size || 0
          result = { id: doc.id, success: true }
          break
        }

        case "archive": {
          const { error } = await supabase
            .from("documents")
            .update({ is_archived: true })
            .eq("id", doc.id)
            .eq("user_id", user.id)
          if (error) throw error
          result = { id: doc.id, success: true, archived: true }
          break
        }

        case "unarchive": {
          const { error } = await supabase
            .from("documents")
            .update({ is_archived: false })
            .eq("id", doc.id)
            .eq("user_id", user.id)
          if (error) throw error
          result = { id: doc.id, success: true, archived: false }
          break
        }

        case "pin": {
          const { error } = await supabase
            .from("documents")
            .update({ is_pinned: true })
            .eq("id", doc.id)
            .eq("user_id", user.id)
          if (error) throw error
          result = { id: doc.id, success: true, pinned: true }
          break
        }

        case "unpin": {
          const { error } = await supabase
            .from("documents")
            .update({ is_pinned: false })
            .eq("id", doc.id)
            .eq("user_id", user.id)
          if (error) throw error
          result = { id: doc.id, success: true, pinned: false }
          break
        }

        case "move": {
          const folderId = body.folderId || null
          if (folderId) {
            // Validate folder exists and belongs to user
            const { data: folder, error: folderError } = await supabase
              .from("documents")
              .select("id")
              .eq("id", folderId)
              .eq("user_id", user.id)
              .single()
            if (folderError || !folder) {
              throw new Error("Invalid folder")
            }
          }
          const { error } = await supabase
            .from("documents")
            .update({ parent_id: folderId })
            .eq("id", doc.id)
            .eq("user_id", user.id)
          if (error) throw error
          result = { id: doc.id, success: true, folderId }
          break
        }

        case "export": {
          // Generate signed URL for download
          const { data: signedUrlData, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(doc.storage_path, 3600) // 1 hour
          
          if (error || !signedUrlData?.signedUrl) {
            throw new Error("Failed to generate download URL")
          }
          
          result = { 
            id: doc.id, 
            success: true, 
            downloadUrl: signedUrlData.signedUrl,
            title: doc.title,
            mimeType: doc.mime_type,
          }
          break
        }

        case "share": {
          // Generate share tokens
          const token = crypto.randomUUID()
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          
          const { error } = await supabase
            .from("document_shares")
            .insert({
              document_id: doc.id,
              user_id: user.id,
              token,
              expires_at: expiresAt.toISOString(),
              permissions: body.permissions || ["view"],
            })

          if (error) throw error
          
          const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${token}`
          result = { 
            id: doc.id, 
            success: true, 
            shareUrl,
            expiresAt: expiresAt.toISOString(),
          }
          break
        }
      }

      results.push(result)
    } catch (error) {
      logger.error(`Bulk action ${action} failed for ${doc.id}:`, { error: error })
      results.push({ id: doc.id, success: false, error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // Track usage for exports/downloads
  if (action === "export") {
    await trackUsage(user.id, "exports", results.filter(r => r.success).length)
  }

  const successCount = results.filter(r => r.success).length
  const failedCount = results.length - successCount

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      succeeded: successCount,
      failed: failedCount,
      action,
    },
  })
})
