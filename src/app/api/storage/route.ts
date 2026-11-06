import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST() {
  return NextResponse.json({ ok: true })
}
