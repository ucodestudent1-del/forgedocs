--- up ---
-- Align documents table schema with TypeScript types

-- Add missing columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Migrate data from old columns to new ones where applicable
-- Map old 'format' to 'mime_type' (best effort)
UPDATE documents SET mime_type = format WHERE mime_type IS NULL AND format IS NOT NULL;
-- Map old 'file_path' to 'storage_path'
UPDATE documents SET storage_path = file_path WHERE storage_path IS NULL AND file_path IS NOT NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON documents(storage_path);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_is_pinned ON documents(is_pinned);

--- down ---
ALTER TABLE documents DROP COLUMN IF EXISTS description;
ALTER TABLE documents DROP COLUMN IF EXISTS storage_path;
ALTER TABLE documents DROP COLUMN IF EXISTS mime_type;
ALTER TABLE documents DROP COLUMN IF EXISTS page_count;
ALTER TABLE documents DROP COLUMN IF EXISTS is_archived;
ALTER TABLE documents DROP COLUMN IF EXISTS is_pinned;
ALTER TABLE documents DROP COLUMN IF EXISTS parent_id;

DROP INDEX IF EXISTS idx_documents_storage_path;
DROP INDEX IF EXISTS idx_documents_mime_type;
DROP INDEX IF EXISTS idx_documents_parent_id;
DROP INDEX IF EXISTS idx_documents_is_archived;
DROP INDEX IF EXISTS idx_documents_is_pinned;
