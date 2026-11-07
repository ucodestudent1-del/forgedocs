import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createRouteClient()
  const { email, password } = await req.json()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const supabase = await createRouteClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

