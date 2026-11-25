"use server"

import { createRouteClient } from "@/lib/supabase"
import { cookies } from "next/headers"
import { z } from "zod"

const emailSchema = z.string().email("Invalid email address")

export async function updateProfileLanguage() {
  return { success: true }
}

export async function getProfileLanguage(): Promise<string | null> {
  return null
}

export async function updateProfile(data: {
  fullName?: string
  email?: string
  bio?: string
  timezone?: string
  language?: string
}) {
  const supabase = await createRouteClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const updateData: Record<string, unknown> = {}
  if (data.fullName !== undefined) updateData.full_name = data.fullName
  if (data.email !== undefined) {
    const emailParse = emailSchema.safeParse(data.email)
    if (!emailParse.success) {
      return { error: "Invalid email address" }
    }
    // Prevent changing email to one already owned by another profile.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", emailParse.data)
      .neq("id", user.id)
      .single()
    if (existing && existing.id) {
      return { error: "Email address is already in use" }
    }
    updateData.email = emailParse.data
  }
  if (data.bio !== undefined) updateData.bio = data.bio
  if (data.timezone !== undefined) updateData.timezone = data.timezone

  if (Object.keys(updateData).length === 0) {
    return { success: true }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)

  if (error) {
    return { error: "Failed to update profile" }
  }

  return { success: true }
}

export async function updateNotificationPreferences(prefs: Record<string, Record<string, boolean>>) {
  const supabase = await createRouteClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({
      user_id: user.id,
      email_notifications: prefs.email,
      push_notifications: prefs.push,
      in_app_notifications: prefs.in_app,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

  if (error) {
    return { error: "Failed to update notification preferences" }
  }

  return { success: true }
}