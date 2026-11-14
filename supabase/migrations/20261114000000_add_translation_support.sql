-- Multi-language translation support
-- Migration: 20261114000000_add_translation_support

-- ============================================
-- Add source language column to documents
-- ============================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

-- ============================================
-- Add language preference to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- ============================================
-- Document translations table (dynamic/UGC content)
-- ============================================
CREATE TABLE IF NOT EXISTS document_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT,
  content TEXT,
  summary TEXT,
  translation_source TEXT CHECK (translation_source IN ('human', 'api', 'auto')) DEFAULT 'api',
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_id UUID REFERENCES profiles(id),
  translated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_document_translations_document_id ON document_translations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_translations_locale ON document_translations(locale);

-- RLS: users can read translations of documents they can access
ALTER TABLE document_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read document translations for accessible documents" ON document_translations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_translations.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert document translations for own documents" ON document_translations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_translations.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update document translations for own documents" ON document_translations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_translations.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete document translations for own documents" ON document_translations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_translations.document_id
        AND d.user_id = auth.uid()
    )
  );

-- ============================================
-- Translation jobs table (async API translation tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  target_locale TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_translation_jobs_document_id ON translation_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);

ALTER TABLE translation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own translation jobs" ON translation_jobs
  FOR SELECT
  USING (
    document_id IS NULL OR EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = translation_jobs.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own translation jobs" ON translation_jobs
  FOR INSERT
  WITH CHECK (
    document_id IS NULL OR EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = translation_jobs.document_id
        AND d.user_id = auth.uid()
    )
  );

-- ============================================
-- Updated at triggers
-- ============================================
CREATE TRIGGER update_document_translations_updated_at BEFORE UPDATE ON document_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
