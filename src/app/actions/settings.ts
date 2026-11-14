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
