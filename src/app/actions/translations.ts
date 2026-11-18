"use server"

import { createRouteClient } from "@/lib/supabase"

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

export async function getDocumentWithTranslation(
  documentId: string
): Promise<DocumentTranslationData | null> {
  const supabase = await createRouteClient()

  const { data: sourceDoc, error: sourceError } = await supabase
    .from("documents")
    .select("id, title, content, mime_type, version, updated_at, user_id, locale")
    .eq("id", documentId)
    .single()

  if (sourceError || !sourceDoc) {
    return null
  }

  return {
    id: sourceDoc.id,
    title: sourceDoc.title,
    content: sourceDoc.content,
    summary: null,
    mime_type: sourceDoc.mime_type,
    version: sourceDoc.version,
    updated_at: sourceDoc.updated_at,
    user_id: sourceDoc.user_id,
    locale: sourceDoc.locale || "en",
    translation_source: null,
    reviewed: true,
  }
}