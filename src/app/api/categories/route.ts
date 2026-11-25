import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
})

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: categories, error } = await supabase
    .from("template_categories")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    // Table might not exist yet, return default categories
    return NextResponse.json({
      categories: [
        { id: "legal", name: "Legal Contracts", slug: "legal", description: "Contracts, NDAs, agreements" },
        { id: "billing", name: "Billing & Invoices", slug: "billing", description: "Invoices, bills, receipts" },
        { id: "sales", name: "Sales & Proposals", slug: "sales", description: "Proposals, quotes, bids" },
        { id: "reports", name: "Reports & Analysis", slug: "reports", description: "Reports, reviews, summaries" },
        { id: "meetings", name: "Meetings & Minutes", slug: "meetings", description: "Meeting minutes, agendas" },
        { id: "hr", name: "Human Resources", slug: "hr", description: "Offer letters, HR documents" },
      ],
    })
  }

  return NextResponse.json({ categories: categories || [] })
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    throw createAppError("Only admins can manage categories", 403, "FORBIDDEN")
  }

  const body = await req.json()
  const { name, slug, description, color, icon } = categorySchema.parse(body)

  const { data, error } = await supabase
    .from("template_categories")
    .insert({ name, slug, description, color, icon })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ category: data }, { status: 201 })
})

export const PATCH = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    throw createAppError("Only admins can manage categories", 403, "FORBIDDEN")
  }

  const body = await req.json()
  const { id, ...updates } = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().optional(),
  }).parse(body)

  const { data, error } = await supabase
    .from("template_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ category: data })
})

export const DELETE = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    throw createAppError("Only admins can manage categories", 403, "FORBIDDEN")
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  if (!id) {
    throw createAppError("Category ID is required", 400, "MISSING_ID")
  }

  const { error } = await supabase
    .from("template_categories")
    .delete()
    .eq("id", id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ success: true })
})
