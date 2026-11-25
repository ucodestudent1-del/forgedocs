import { NextRequest, NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import logger from "@/lib/logger"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { sendEmail } from "@/lib/email"
import { getBaseTemplate, escapeHtml } from "@/lib/email"
import { createServiceRoleClient } from "@/lib/supabase"

export const POST = withErrorBoundary(async (request) => {
  const rateLimitError = await documentRateLimit(request)
  if (rateLimitError) return rateLimitError

  await validateCSRF(request)

  const body = await request.json()
  const { fullName, email, company, subject, message } = body

  if (!email || !message) {
    return NextResponse.json({ error: "Email and message are required" }, { status: 400 })
  }

  const safeFullName = String(fullName || "").replace(/[\r\n]/g, " ")
  const safeEmail = String(email || "").replace(/[\r\n]/g, " ")
  const safeCompany = String(company || "").replace(/[\r\n]/g, " ")
  const safeSubject = String(subject || "").replace(/[\r\n]/g, " ")
  const safeMessage = String(message || "").replace(/[\r\n]/g, " ")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"
  const fromEmail = process.env.EMAIL_FROM || "ForgeDocs <noreply@forgedocs.com>"

  const supportHtml = getBaseTemplate(`
    <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">New Contact Form Submission</h2>
    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 24px;">
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Name:</strong></td><td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${escapeHtml(safeFullName)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong></td><td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${escapeHtml(safeEmail)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Company:</strong></td><td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${escapeHtml(safeCompany)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Subject:</strong></td><td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${escapeHtml(safeSubject)}</td></tr>
    </table>
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>Message:</strong></p>
      <p style="color: #1f2937; font-size: 14px; white-space: pre-wrap; margin: 0;">${escapeHtml(safeMessage)}</p>
    </div>
  `, "New Contact Form Submission")

  const confirmationHtml = getBaseTemplate(`
    <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Thanks for reaching out, ${escapeHtml(safeFullName || "there")}!</h2>
    <p style="color: #1f2937; font-size: 14px; line-height: 1.6;">We've received your message and will get back to you within 24 hours.</p>
    <p style="color: #1f2937; font-size: 14px; line-height: 1.6;">In the meantime, you can explore our <a href="${appUrl}/faq" style="color: #3b82f6; text-decoration: none;">FAQ</a> or <a href="${appUrl}/help" style="color: #3b82f6; text-decoration: none;">Help Center</a> for quick answers.</p>
  `, "Thanks for contacting ForgeDocs")

  try {
    const supabase = await createServiceRoleClient()
    const { error: ticketError } = await (supabase as any)
      .from("support_tickets")
      .insert({
        email: safeEmail,
        full_name: safeFullName || null,
        company: safeCompany || null,
        subject: safeSubject || null,
        message: safeMessage,
        status: "open",
        source: "contact_form",
      })

    if (ticketError) {
      logger.error("Failed to create support ticket:", { error: ticketError })
    }

    const supportEmailResult = await sendEmail({
      to: process.env.SUPPORT_EMAIL || "hello@forgedocs.com",
      subject: `[Contact Form] ${safeSubject || "New Message"} - ${safeEmail}`,
      html: supportHtml,
    })

    if (!supportEmailResult.success) {
      logger.error("Failed to send support notification:", { error: supportEmailResult.error })
    }

    const confirmationResult = await sendEmail({
      to: safeEmail,
      subject: "Thanks for contacting ForgeDocs",
      html: confirmationHtml,
    })

    if (!confirmationResult.success) {
      logger.error("Failed to send confirmation email:", { error: confirmationResult.error })
    }

    logger.info("Contact form processed", { email: safeEmail, subject: safeSubject })
  } catch (error) {
    logger.error("Contact form processing error:", { error: error instanceof Error ? error.message : String(error) })
  }

  return NextResponse.json({ 
    message: "Message sent successfully" 
  })
})
