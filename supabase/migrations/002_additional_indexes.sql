--- up ---
-- Additional indexes for performance optimization

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_user_created ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_status_created ON documents(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN (to_tsvector('english', title || ' ' || coalesce(content, '')));

CREATE INDEX IF NOT EXISTS idx_document_versions_doc_version ON document_versions(document_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_signature_requests_user_status ON signature_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_created ON signature_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_created ON activity_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_severity ON audit_logs(user_id, severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC) WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_team_members_team_role ON team_members(team_id, role);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhooks_user_active_events ON webhooks(user_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN (events);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date DESC);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(user_id, created_at DESC) WHERE status != 'trashed';
CREATE INDEX IF NOT EXISTS idx_signature_requests_pending ON signature_requests(user_id, created_at DESC) WHERE status IN ('pending', 'sent');
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id, current_period_end) WHERE status = 'active';

-- Statistics for query planner
ANALYZE profiles;
ANALYZE documents;
ANALYZE document_versions;
ANALYZE templates;
ANALYZE signature_requests;
ANALYZE signature_request_signers;
ANALYZE activity_logs;
ANALYZE subscriptions;
ANALYZE audit_logs;
ANALYZE notifications;
ANALYZE teams;
ANALYZE team_members;
ANALYZE api_keys;
ANALYZE webhooks;
ANALYZE usage_tracking;

--- down ---
-- Drop all indexes created in this migration
DROP INDEX IF EXISTS idx_documents_user_created;
DROP INDEX IF EXISTS idx_documents_user_status_created;
DROP INDEX IF EXISTS idx_documents_search;
DROP INDEX IF EXISTS idx_document_versions_doc_version;
DROP INDEX IF EXISTS idx_signature_requests_user_status;
DROP INDEX IF EXISTS idx_signature_requests_created;
DROP INDEX IF EXISTS idx_activity_logs_user_action;
DROP INDEX IF EXISTS idx_activity_logs_entity_created;
DROP INDEX IF EXISTS idx_subscriptions_user_status;
DROP INDEX IF EXISTS idx_subscriptions_period_end;
DROP INDEX IF EXISTS idx_audit_logs_user_severity;
DROP INDEX IF EXISTS idx_audit_logs_entity_created;
DROP INDEX IF EXISTS idx_notifications_user_read_created;
DROP INDEX IF EXISTS idx_team_members_team_role;
DROP INDEX IF EXISTS idx_api_keys_user_active;
DROP INDEX IF EXISTS idx_api_keys_expires;
DROP INDEX IF EXISTS idx_webhooks_user_active_events;
DROP INDEX IF EXISTS idx_webhooks_events;
DROP INDEX IF EXISTS idx_usage_tracking_user_date;
DROP INDEX IF EXISTS idx_documents_active;
DROP INDEX IF EXISTS idx_signature_requests_pending;
DROP INDEX IF EXISTS idx_subscriptions_active;