-- Phase 5 Database Optimizations
-- Migration: 20261108000002_phase5_optimizations

-- ============================================
-- Full-text search on documents
-- ============================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN (search_vector);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_search_vector ON documents;
CREATE TRIGGER trigger_update_search_vector
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ============================================
-- Full-text search on templates
-- ============================================
ALTER TABLE templates ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_templates_search_vector ON templates USING GIN (search_vector);

CREATE OR REPLACE FUNCTION update_template_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_search_vector ON templates;
CREATE TRIGGER trigger_update_template_search_vector
  BEFORE INSERT OR UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_template_search_vector();

-- ============================================
-- Consolidate document storage: remove dual storage
-- Keep content in DB, use storage_path only for exported files
-- ============================================
-- Add index for storage path lookups
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON documents(storage_path);

-- ============================================
-- Add composite indexes for common query patterns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, is_archived, is_pinned);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_user_status_created ON conversion_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_metric_period ON usage_records(user_id, metric, recorded_at DESC);

-- ============================================
-- Add unique constraint on usage_records per user/metric/day
-- ============================================
DROP INDEX IF EXISTS idx_usage_records_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_records_user_metric_day
  ON usage_records(user_id, metric, date_trunc('day', recorded_at));

-- ============================================
-- Add onboarding columns to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================
-- Add missing columns to profiles for MFA
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ============================================
-- Add session tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, revoked_at) WHERE revoked_at IS NULL;

-- ============================================
-- Add audit log insert policy (for API to write)
-- ============================================
DROP POLICY IF EXISTS "API can insert audit logs" ON audit_logs;
CREATE POLICY "API can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Add performance monitoring view
-- ============================================
CREATE OR REPLACE VIEW system_health AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
  (SELECT COUNT(*) FROM documents WHERE created_at > NOW() - INTERVAL '24 hours') as new_documents_24h,
  (SELECT COUNT(*) FROM conversion_jobs WHERE status = 'pending') as pending_conversions,
  (SELECT COUNT(*) FROM conversion_jobs WHERE status = 'processing') as processing_conversions,
  (SELECT COUNT(*) FROM conversion_jobs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') as failed_conversions_24h,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
  (SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL) as active_sessions;

-- ============================================
-- Add subscription tier limits table
-- ============================================
CREATE TABLE IF NOT EXISTS tier_limits (
  tier TEXT PRIMARY KEY,
  documents_per_month INTEGER DEFAULT 500,
  conversions_per_month INTEGER DEFAULT 100,
  storage_gb INTEGER DEFAULT 5,
  max_file_size_mb INTEGER DEFAULT 10,
  api_requests_per_minute INTEGER DEFAULT 30,
  has_priority_support BOOLEAN DEFAULT FALSE,
  has_audit_logs BOOLEAN DEFAULT FALSE,
  has_advanced_templates BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tier_limits (tier, documents_per_month, conversions_per_month, storage_gb, max_file_size_mb, api_requests_per_minute, has_priority_support, has_audit_logs, has_advanced_templates)
VALUES
  ('free', 500, 100, 5, 10, 30, FALSE, FALSE, FALSE),
  ('pro', -1, -1, 100, 50, 100, TRUE, TRUE, TRUE),
  ('business', -1, -1, 500, 100, 500, TRUE, TRUE, TRUE)
ON CONFLICT (tier) DO UPDATE SET
  documents_per_month = EXCLUDED.documents_per_month,
  conversions_per_month = EXCLUDED.conversions_per_month,
  storage_gb = EXCLUDED.storage_gb,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  api_requests_per_minute = EXCLUDED.api_requests_per_minute,
  has_priority_support = EXCLUDED.has_priority_support,
  has_audit_logs = EXCLUDED.has_audit_logs,
  has_advanced_templates = EXCLUDED.has_advanced_templates;

-- ============================================
-- Function to check tier limits
-- ============================================
CREATE OR REPLACE FUNCTION check_tier_limit(p_user_id UUID, p_metric TEXT, p_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_current INTEGER;
  v_start TIMESTAMPTZ;
BEGIN
  -- Get user's tier
  SELECT COALESCE(s.tier, 'free') INTO v_tier
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Get limit for tier
  SELECT
    CASE p_metric
      WHEN 'documents_created' THEN documents_per_month
      WHEN 'conversions' THEN conversions_per_month
      WHEN 'storage_bytes' THEN storage_gb * 1024 * 1024 * 1024
      ELSE NULL
    END INTO v_limit
  FROM tier_limits
  WHERE tier = v_tier;

  -- Unlimited
  IF v_limit IS NULL OR v_limit < 0 THEN
    RETURN TRUE;
  END IF;

  -- Calculate current usage for this period
  v_start := date_trunc('month', NOW());

  SELECT COALESCE(SUM(quantity), 0) INTO v_current
  FROM usage_records
  WHERE user_id = p_user_id
    AND metric = p_metric
    AND recorded_at >= v_start;

  RETURN (v_current + p_quantity) <= v_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add updated_at triggers for new tables
-- ============================================
CREATE TRIGGER update_tier_limits_updated_at BEFORE UPDATE ON tier_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Backfill search vectors for existing data
-- ============================================
UPDATE documents SET search_vector = update_search_vector()::tsvector WHERE search_vector IS NULL;
UPDATE templates SET search_vector = update_template_search_vector()::tsvector WHERE search_vector IS NULL;