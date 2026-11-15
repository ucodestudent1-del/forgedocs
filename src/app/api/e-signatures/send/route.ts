import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

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

    // Upload document to Supabase Storage
    const documentId = uuidv4()
    const documentPath = `${user.id}/${documentId}/${document.name}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(documentPath, document, {
        contentType: document.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Document upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
    }

    // Create signature request record in database
    const signatureRequestId = uuidv4()
    const signingLinks: Array<{ signer: typeof signers[0]; link: string }> = []

    // Create signature request record
    const { error: requestError } = await supabase
      .from("signature_requests")
      .insert({
        id: signatureRequestId,
        user_id: user.id,
        document_id: documentId,
        document_name: document.name,
        document_path: documentPath,
        message: message || "",
        status: "pending",
        created_at: new Date().toISOString(),
      })

    if (requestError) {
      console.error("Signature request creation error:", requestError)
      return NextResponse.json({ error: "Failed to create signature request" }, { status: 500 })
    }

    // Create signer records and generate signing links
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i]
      const signerId = uuidv4()
      const signingToken = uuidv4()
      
      const { error: signerError } = await supabase
        .from("signature_request_signers")
        .insert({
          id: signerId,
          signature_request_id: signatureRequestId,
          name: signer.name,
          email: signer.email,
          order: signer.order || i + 1,
          status: "pending",
          signing_token: signingToken,
          created_at: new Date().toISOString(),
        })

      if (signerError) {
        console.error("Signer creation error:", signerError)
        continue
      }

      // Generate signing link (in production, this would be a secure URL)
      const signingLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign/${signingToken}`
      signingLinks.push({ signer, link: signingLink })
    }

    // Send emails to signers (in production, use a proper email service)
    // For now, we'll log the emails that would be sent
    for (const { signer, link } of signingLinks) {
      console.log(`[E-SIGNATURE] Would send email to ${signer.email} with signing link: ${link}`)
      
      // In production, integrate with email service (SendGrid, Resend, etc.)
      // await sendEmail({
      //   to: signer.email,
      //   subject: `Signature Request: ${document.name}`,
      //   template: "signature-request",
      //   data: { signerName: signer.name, documentName: document.name, message, link }
      // })
    }

    return NextResponse.json({ 
      signatureRequestId,
      signingLinks,
      message: "Signature request sent successfully" 
    })
  } catch (error) {
    console.error("E-signature send error:", error)
    return NextResponse.json({ error: "Failed to send signature request" }, { status: 500 })
  }
}