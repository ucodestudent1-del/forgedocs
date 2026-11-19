import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  // Get user's teams for team-based access
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)

  const teamIds = (teamMembers as any[]).map((tm: any) => tm.team_id)

  const { data: template, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .or(`user_id.eq.${user.id},is_public.eq.true,team_id.in.(${teamIds.map(() => '?').join(',')})`, ...teamIds)
    .single()

  if (error || !template) {
    throw createAppError("Template not found", 404, "TEMPLATE_NOT_FOUND")
  }

  return NextResponse.json({ template })
})

export const DELETE = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  // Only owner or admin can delete
  const { data: template } = await supabase
    .from("templates")
    .select("user_id, is_system")
    .eq("id", id)
    .single()

  if (!template) {
    throw createAppError("Template not found", 404, "TEMPLATE_NOT_FOUND")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"
  const isOwner = template.user_id === user.id

  if (!isOwner && !isAdmin) {
    throw createAppError("Forbidden - not the template owner", 403, "FORBIDDEN")
  }

  // Prevent deleting system templates unless admin
  if (template.is_system && !isAdmin) {
    throw createAppError("Cannot delete system template", 403, "FORBIDDEN")
  }

  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ success: true })
})
