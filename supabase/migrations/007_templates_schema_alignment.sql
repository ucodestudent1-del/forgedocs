--- up ---
-- Align templates table schema with TypeScript types

-- Add missing columns
ALTER TABLE templates ADD COLUMN IF NOT EXISTS placeholder_schema JSONB DEFAULT '[]';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Migrate data from old columns to new ones
-- Map old 'fields' to 'placeholder_schema'
UPDATE templates SET placeholder_schema = fields WHERE placeholder_schema = '[]' AND fields IS NOT NULL AND fields != '[]';
-- Map old 'thumbnail_url' to 'preview_url'
UPDATE templates SET preview_url = thumbnail_url WHERE preview_url IS NULL AND thumbnail_url IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);

--- down ---
ALTER TABLE templates DROP COLUMN IF EXISTS placeholder_schema;
ALTER TABLE templates DROP COLUMN IF EXISTS source_url;
ALTER TABLE templates DROP COLUMN IF EXISTS preview_url;
ALTER TABLE templates DROP COLUMN IF EXISTS tags;

DROP INDEX IF EXISTS idx_templates_category;
DROP INDEX IF EXISTS idx_templates_is_public;
DROP INDEX IF EXISTS idx_templates_created_by;
