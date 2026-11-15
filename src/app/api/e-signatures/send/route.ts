import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const document = formData.get("document") as File
    const signers = JSON.parse(formData.get("signers") as string)
    const message = formData.get("message") as string

    if (!document || !signers?.length) {
      return NextResponse.json({ error: "Missing document or signers" }, { status: 400 })
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.name || !signer.email) {
        return NextResponse.json({ error: "All signers must have name and email" }, { status: 400 })
      }
    }

    // In production, this would:
    // 1. Upload document to storage
    // 2. Create signature request records in database
    // 3. Send emails to signers with signing links
    // 4. Return the signature request ID

    // For now, return mock success
    return NextResponse.json({ 
      signatureRequestId: "sig_" + Math.random().toString(36).substr(2, 9),
      message: "Signature request sent successfully" 
    })
  } catch (error) {
    console.error("E-signature send error:", error)
    return NextResponse.json({ error: "Failed to send signature request" }, { status: 500 })
  }
}