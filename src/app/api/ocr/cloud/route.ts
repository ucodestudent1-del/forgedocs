import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { performCloudOCR } from "@/lib/ocr/cloud"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const provider = (formData.get("provider") as 'aws' | 'google' | 'azure') || 'aws'

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    // Server-side file size check (defense in depth against bypassed client limits)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 })
    }

    const validProviders = ['aws', 'google', 'azure']
    if (!['aws', 'google', 'azure'].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    const result = await performCloudOCR(file, provider)

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      pages: result.pages,
      provider: result.provider
    })
  } catch (error) {
    console.error("Cloud OCR error:", error)
    return NextResponse.json({ error: "Cloud OCR processing failed" }, { status: 500 })
  }
}