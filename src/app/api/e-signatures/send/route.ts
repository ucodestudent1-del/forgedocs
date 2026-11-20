import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"
import { Resend } from "resend"
import { escapeHtml } from "@/lib/email"
import { validateCSRF } from "@/lib/csrf"
import { scanFile } from "@/lib/malware-scan"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/**
 * Validate a signing token and check expiration.
 * To be used by the /sign/[token] route handler.
 */
async function validateSigningToken(supabase: any, signingToken: string): Promise<{
  valid: boolean
  signerId?: string
  signatureRequestId?: string
  expired?: boolean
}> {
  const { data: signer, error } = await supabase
    .from("signature_request_signers")
    .select("id, signature_request_id, signing_token, status, expires_at")
    .eq("signing_token", signingToken)
    .single()

  if (error || !signer) {
    return { valid: false }
  }

  if (signer.status !== "pending") {
    return { valid: false }
  }

  if (signer.expires_at && new Date(signer.expires_at) < new Date()) {
    return { valid: false, expired: true }
  }

  return {
    valid: true,
    signerId: signer.id,
    signatureRequestId: signer.signature_request_id,
  }
}

export const POST = withErrorBoundary(async (request) => {
  const rateLimitError = await documentRateLimit(request)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  await validateCSRF(request)

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

  // Malware scan the document before upload
  const documentArrayBuffer = await document.arrayBuffer()
  const documentBytes = new Uint8Array(documentArrayBuffer)
  const docScanResult = await scanFile(documentBytes, document.name)
  if (!docScanResult.clean) {
    throw createAppError(
      docScanResult.threat === "scanner_unavailable"
        ? "Malware scanner unavailable — upload blocked"
        : "Malware detected in file",
      400,
      "MALWARE_DETECTED"
    )
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
    throw createAppError("Failed to upload document", 500, "STORAGE_UPLOAD_ERROR")
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
    throw createAppError("Failed to create signature request", 500, "DATABASE_ERROR")
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
              <p>Hi ${escapeHtml(signer.name)},</p>
              <p>You've been requested to sign <strong>${escapeHtml(document.name)}</strong> by ${escapeHtml(user.email)}.</p>
              ${message ? `<p style="background: #f5f5f5; padding: 16px; border-radius: 8px;">${escapeHtml(message)}</p>` : ''}
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
})