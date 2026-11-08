import { Resend } from "resend"

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY not configured")
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const resend = getResend()
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "ForgeDocs <noreply@forgedocs.com>",
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (result.error) {
      console.error("Resend error:", result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Email send failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export function getBaseTemplate(content: string, preheader: string = ""): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${preheader}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">ForgeDocs</h1>
              <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 14px;">Document Intelligence Platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                This email was sent to you because you have a ForgeDocs account.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; ${new Date().getFullYear()} ForgeDocs. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export function getButtonHtml(url: string, text: string, style: "primary" | "secondary" = "primary"): string {
  const colors = {
    primary: { bg: "#3b82f6", hover: "#2563eb", text: "#ffffff" },
    secondary: { bg: "#ffffff", hover: "#f3f4f6", text: "#3b82f6" },
  }
  const c = colors[style]
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px auto;">
      <tr>
        <td style="border-radius: 6px; background-color: ${c.bg};" bgcolor="${c.bg}">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${c.text}; text-decoration: none; border-radius: 6px; border: ${style === "secondary" ? "1px solid #d1d5db" : "none"};">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `
}

export function getCodeHtml(code: string): string {
  return `
    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #1f2937;">${code}</span>
    </div>
  `
}