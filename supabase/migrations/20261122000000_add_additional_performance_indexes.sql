-- Additional performance indexes for common query patterns
-- Run these in Supabase SQL editor

-- Documents table - additional composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id_archived_pinned ON documents(user_id, is_archived, is_pinned);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_created_at ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);

-- Usage records indexes for tier limit checks
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id_metric_recorded_at ON usage_records(user_id, metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_recorded_at ON usage_records(recorded_at DESC);

-- Subscriptions indexes for tier lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status_created_at ON subscriptions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Tier limits indexes
CREATE INDEX IF NOT EXISTS idx_tier_limits_tier ON tier_limits(tier);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_created_at ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type_entity_id ON audit_log(entity_type, entity_id);

-- Conversion jobs indexes
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_user_id_created_at ON conversion_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status ON conversion_jobs(status);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id_is_system ON templates(user_id, is_system);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id_folder_id ON files(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id_created_at ON files(user_id, created_at DESC);

-- E-signatures indexes
CREATE INDEX IF NOT EXISTS idx_e_signatures_user_id_status ON e_signatures(user_id, status);
CREATE INDEX IF NOT EXISTS idx_e_signatures_document_id ON e_signatures(document_id);

-- PDF tools indexes
CREATE INDEX IF NOT EXISTS idx_pdf_tools_jobs_user_id_status ON pdf_tool_jobs(user_id, status);
