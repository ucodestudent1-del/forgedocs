import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { bucket, path: filePath, contentType } = body

  const { data, error } = await (supabase as any).storage
    .from(bucket)
    .createSignedUploadUrl(filePath, {
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ uploadUrl: data.signedUrl, path: filePath })
}

export async function GET(req: Request) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get("bucket") || "documents"
  const path = searchParams.get("path")

  if (!path) {
    return NextResponse.json({ error: "Path required" }, { status: 400 })
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 900)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ downloadUrl: data.signedUrl })
}

