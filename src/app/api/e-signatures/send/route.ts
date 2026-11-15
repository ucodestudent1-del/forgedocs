import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

    // Create signature request record
    const signatureRequestId = uuidv4()
    const signingLinks: Array<{ signer: typeof signers[0]; link: string }> = []

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
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

      const signingLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign/${signingToken}`
      signingLinks.push({ signer, link: signingLink })
    }

    // Send emails to signers
    if (resend) {
      for (const { signer, link } of signingLinks) {
        try {
          await resend.emails.send({
            from: "ForgeDocs <signatures@forgedocs.com>",
            to: signer.email,
            subject: `Signature Request: ${document.name}`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1a1a1a;">Signature Request</h1>
                <p>Hi ${signer.name},</p>
                <p>You've been requested to sign <strong>${document.name}</strong> by ${user.email}.</p>
                ${message ? `<p style="background: #f5f5f5; padding: 16px; border-radius: 8px;">${message}</p>` : ''}
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${link}" style="background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                    Review & Sign Document
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">This link expires in 30 days. If you didn't expect this request, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px;">Sent via ForgeDocs - Professional Document Management</p>
              </div>
            `,
          })
        } catch (emailError) {
          console.error(`Failed to send email to ${signer.email}:`, emailError)
        }
      }
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