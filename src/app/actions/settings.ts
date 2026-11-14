"use server"

import { createRouteClient } from "@/lib/supabase"
import { cookies } from "next/headers"
import { locales, defaultLocale } from "@/i18n/locales"

export async function updateProfileLanguage(language: string) {
  if (!locales.includes(language as any)) {
    return { error: "Unsupported language" }
  }

  const supabase = await createRouteClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ language })
    .eq("id", user.id)

  if (error) {
    return { error: "Failed to save language preference" }
  }

  // Set cookie for middleware/client-side consistency
  const cookieStore = await cookies()
  cookieStore.set("locale", language, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  })

  return { success: true }
}

export async function getProfileLanguage(): Promise<string | null> {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single()

  return profile?.language || null
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
  if (data.email !== undefined) updateData.email = data.email
  if (data.bio !== undefined) updateData.bio = data.bio
  if (data.timezone !== undefined) updateData.timezone = data.timezone
  if (data.language !== undefined) updateData.language = data.language

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

  if (data.language) {
    const cookieStore = await cookies()
    cookieStore.set("locale", data.language, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    })
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
