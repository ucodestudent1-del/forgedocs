import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const path = url.searchParams.get("path")
  const bucket = url.searchParams.get("bucket") || "documents"

  if (!path) {
    return NextResponse.json({ error: "Path parameter required" }, { status: 400 })
  }

  // Verify user owns this file (path should start with user.id)
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Generate signed URL (valid for 5 minutes)
  const { data: signedUrlData, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300)

  if (error || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Redirect to signed URL
  return NextResponse.redirect(signedUrlData.signedUrl)
}