"use server"

import { createRouteClient } from "@/lib/supabase"
import { locales, defaultLocale } from "@/i18n/locales"

export interface DocumentTranslationData {
  id: string
  title: string
  content: string
  summary?: string | null
  mime_type: string
  version: number
  updated_at: string
  user_id: string
  locale: string
  translation_source?: string | null
  reviewed: boolean
}

/**
 * Fetch a document with translation fallback.
 * Resolution order:
 *   1. user's preferred locale translation
 *   2. document's source locale
 *   3. default locale (en)
 *   4. document source (fallback)
 */
export async function getDocumentWithTranslation(
  documentId: string,
  userLocale: string
): Promise<DocumentTranslationData | null> {
  const supabase = await createRouteClient()

  // Validate locale
  if (!locales.includes(userLocale as any)) {
    userLocale = defaultLocale
  }

  // Try to fetch the document (source) first to get its metadata and source locale
  const { data: sourceDoc, error: sourceError } = await supabase
    .from("documents")
    .select("id, title, content, mime_type, version, updated_at, user_id, locale")
    .eq("id", documentId)
    .single()

  if (sourceError || !sourceDoc) {
    return null
  }

  const sourceLocale = (sourceDoc as any).locale || defaultLocale

  // If user wants source locale, return source directly
  if (userLocale === sourceLocale) {
    return {
      id: sourceDoc.id,
      title: sourceDoc.title,
      content: sourceDoc.content,
      summary: null,
      mime_type: sourceDoc.mime_type,
      version: sourceDoc.version,
      updated_at: sourceDoc.updated_at,
      user_id: sourceDoc.user_id,
      locale: sourceLocale,
      translation_source: null,
      reviewed: true,
    }
  }

  // Try to fetch translation in user's locale
  const { data: translation } = await supabase
    .from("document_translations")
    .select("title, content, summary, translation_source, reviewed")
    .eq("document_id", documentId)
    .eq("locale", userLocale)
    .maybeSingle()

  if (translation && !translation.error) {
    return {
      id: sourceDoc.id,
      title: translation.title || sourceDoc.title,
      content: translation.content || sourceDoc.content,
      summary: translation.summary || null,
      mime_type: sourceDoc.mime_type,
      version: sourceDoc.version,
      updated_at: sourceDoc.updated_at,
      user_id: sourceDoc.user_id,
      locale: userLocale,
      translation_source: translation.translation_source || null,
      reviewed: !!translation.reviewed,
    }
  }

  // Fallback: try default locale translation
  if (userLocale !== defaultLocale) {
    const { data: defaultTranslation } = await supabase
      .from("document_translations")
      .select("title, content, summary, translation_source, reviewed")
      .eq("document_id", documentId)
      .eq("locale", defaultLocale)
      .maybeSingle()

    if (defaultTranslation && !defaultTranslation.error) {
      return {
        id: sourceDoc.id,
        title: defaultTranslation.title || sourceDoc.title,
        content: defaultTranslation.content || sourceDoc.content,
        summary: defaultTranslation.summary || null,
        mime_type: sourceDoc.mime_type,
        version: sourceDoc.version,
        updated_at: sourceDoc.updated_at,
        user_id: sourceDoc.user_id,
        locale: defaultLocale,
        translation_source: defaultTranslation.translation_source || null,
        reviewed: !!defaultTranslation.reviewed,
      }
    }
  }

  // Final fallback: return source document
  return {
    id: sourceDoc.id,
    title: sourceDoc.title,
    content: sourceDoc.content,
    summary: null,
    mime_type: sourceDoc.mime_type,
    version: sourceDoc.version,
    updated_at: sourceDoc.updated_at,
    user_id: sourceDoc.user_id,
    locale: sourceLocale,
    translation_source: null,
    reviewed: true,
  }
}

export async function getUserLocale(): Promise<string> {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return defaultLocale

  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single()

  const lang = profile?.language
  return locales.includes(lang as any) ? lang : defaultLocale
}
