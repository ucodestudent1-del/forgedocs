import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1).max(100).optional(),
})

export async function POST(req: Request) {
  const supabase = await createRouteClient()
  const body = await req.json()

  const { email, password, full_name } = signupSchema.parse(body)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Create user profile if signup successful
  if (data.user) {
    const { error: profileError } = await (supabase as any).from("profiles").insert({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || null,
    })

    if (profileError) {
      console.error("Failed to create profile:", profileError)
    }
  }

  return NextResponse.json({ user: data.user }, { status: 201 })
}