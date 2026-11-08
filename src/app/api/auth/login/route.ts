import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"

export async function POST(req: Request) {
  const csrfError = await validateCSRF(req)
  if (csrfError) return csrfError

  const supabase = await getRouteClient()
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
  const supabase = await getRouteClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
