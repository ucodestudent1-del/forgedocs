import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async () => {
  return NextResponse.json({ ok: true })
})

export const POST = withErrorBoundary(async () => {
  return NextResponse.json({ ok: true })
})
