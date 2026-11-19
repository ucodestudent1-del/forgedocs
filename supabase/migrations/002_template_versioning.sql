--- up ---
-- Template versions table for template versioning
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    content TEXT NOT NULL,
    placeholder_schema JSONB DEFAULT '[]',
    changed_by UUID REFERENCES profiles(id),
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS version_count INTEGER DEFAULT 0;

-- Add index for template_versions
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(template_id, version DESC);

-- Add indexes for new template columns
CREATE INDEX IF NOT EXISTS idx_templates_team_id ON templates(team_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_favorite ON templates(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON templates(is_system) WHERE is_system = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates(usage_count DESC);

-- Apply updated_at trigger to template_versions
CREATE TRIGGER update_template_versions_updated_at BEFORE UPDATE ON template_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

--- down ---
DROP TRIGGER IF EXISTS update_template_versions_updated_at ON template_versions;
DROP INDEX IF EXISTS idx_template_versions_template_id;
DROP INDEX IF EXISTS idx_template_versions_version;
DROP INDEX IF EXISTS idx_templates_team_id;
DROP INDEX IF EXISTS idx_templates_is_favorite;
DROP INDEX IF EXISTS idx_templates_is_system;
DROP INDEX IF EXISTS idx_templates_usage_count;
DROP TABLE IF EXISTS template_versions CASCADE;
ALTER TABLE templates DROP COLUMN IF EXISTS team_id;
ALTER TABLE templates DROP COLUMN IF EXISTS is_favorite;
ALTER TABLE templates DROP COLUMN IF EXISTS is_system;
ALTER TABLE templates DROP COLUMN IF EXISTS usage_count;
