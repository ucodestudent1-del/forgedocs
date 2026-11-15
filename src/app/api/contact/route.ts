import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, company, subject, message } = body

    if (!email || !message) {
      return NextResponse.json({ error: "Email and message are required" }, { status: 400 })
    }

    // In production, this would:
    // 1. Send email to support team
    // 2. Create support ticket in help desk system
    // 3. Send confirmation email to user

    // For now, just log and return success
    // Sanitize values before logging to prevent log injection
    const safeLog = {
      fullName: String(fullName || "").replace(/[\r\n]/g, " "),
      email: String(email || "").replace(/[\r\n]/g, " "),
      company: String(company || "").replace(/[\r\n]/g, " "),
      subject: String(subject || "").replace(/[\r\n]/g, " "),
      message: String(message || "").replace(/[\r\n]/g, " "),
    }
    console.log("Contact form submission:", safeLog)

    return NextResponse.json({ 
      message: "Message sent successfully" 
    })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}