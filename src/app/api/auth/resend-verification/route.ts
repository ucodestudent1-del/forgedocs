import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient()
    const body = await req.json()
    const { email } = resendSchema.parse(body)

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Verification email sent" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 })
  }
}