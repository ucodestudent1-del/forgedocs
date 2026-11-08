-- Run these in Supabase SQL editor to add indexes for common query patterns

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_archived ON documents(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_updated_at ON documents(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_pinned ON documents(user_id, is_pinned) WHERE is_pinned = true;

-- Document versions indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id_version ON document_versions(document_id, version DESC);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id_category ON templates(user_id, category);

-- Conversion jobs indexes
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_user_id ON conversion_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_user_id_status ON conversion_jobs(user_id, status);

-- Audit log indexes (if audit table exists)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
