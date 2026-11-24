-- Gap analysis: implement missing features
-- Migration: 20261124000000_implement_missing_features

-- ============================================================================
-- End-to-End Encryption: add encryption columns to documents
-- ============================================================================
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS encryption_key_wrapped TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
  ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT DEFAULT 'AES-256-GCM';

COMMENT ON COLUMN documents.encryption_key_wrapped IS 'Wrapped per-document data encryption key (KEK-wrapped), null when E2EE not enabled';
COMMENT ON COLUMN documents.encryption_iv IS 'Initialization vector for document encryption';
COMMENT ON COLUMN documents.encryption_algorithm IS 'Encryption algorithm used';

-- ============================================================================
-- Real-Time Collaboration: document presence + cursor table
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar_url TEXT,
  cursor_position JSONB DEFAULT '{}',
  selection JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_document_presence_document_id ON document_presence(document_id);
CREATE INDEX IF NOT EXISTS idx_document_presence_last_seen ON document_presence(last_seen_at DESC);

ALTER TABLE document_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage presence on their documents" ON document_presence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_presence.document_id AND documents.user_id = auth.uid())
  );

CREATE POLICY "Users can view presence on shared documents" ON document_presence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM document_shares WHERE document_shares.document_id = document_presence.document_id AND document_shares.shared_with = auth.uid())
  );

-- ============================================================================
-- SSO / SAML: provider configurations + linked accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS saml_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  sso_url TEXT NOT NULL,
  x509_certificate TEXT NOT NULL,
  name_id_format TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  attribute_mapping JSONB DEFAULT '{"email": "email", "firstName": "first_name", "lastName": "last_name"}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saml_providers_user_id ON saml_providers(user_id);

CREATE TABLE IF NOT EXISTS saml_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES saml_providers(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_saml_accounts_user_id ON saml_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_saml_accounts_external_id ON saml_accounts(external_id);

ALTER TABLE saml_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own SAML providers" ON saml_providers
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SSO / SAML: relay states for CSRF protection on ACS
-- ============================================================================
CREATE TABLE IF NOT EXISTS saml_relay_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES saml_providers(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saml_relay_states_relay_state ON saml_relay_states(relay_state);
CREATE INDEX IF NOT EXISTS idx_saml_relay_states_expires_at ON saml_relay_states(expires_at);

ALTER TABLE saml_relay_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own relay states" ON saml_relay_states
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  dns_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  ssl_certificate TEXT,
  ssl_private_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_hostname ON custom_domains(hostname);

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own custom domains" ON custom_domains
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Webhooks: endpoints + deliveries
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id ON webhook_endpoints(user_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own webhook endpoints" ON webhook_endpoints
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM webhook_endpoints WHERE webhook_endpoints.id = webhook_deliveries.endpoint_id AND webhook_endpoints.user_id = auth.uid())
  );

-- ============================================================================
-- Custom Integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_integration_id ON user_integrations(integration_id);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own integrations" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Batch jobs tasks (batch_jobs table already exists; add tasks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS batch_job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_job_tasks_batch_job_id ON batch_job_tasks(batch_job_id);
CREATE INDEX IF NOT EXISTS idx_batch_job_tasks_status ON batch_job_tasks(status);

-- ============================================================================
-- Two-Factor Authentication: mfa_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS mfa_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret TEXT,
  totp_secret_encrypted TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[],
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_profiles_user_id ON mfa_profiles(user_id);

ALTER TABLE mfa_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own MFA profile" ON mfa_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Document collaboration versions / operational transform snapshots
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_collab_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  yjs_state JSONB NOT NULL DEFAULT '{}',
  version_number INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_collab_snapshots_document_id ON document_collab_snapshots(document_id);
CREATE INDEX IF NOT EXISTS idx_document_collab_snapshots_version ON document_collab_snapshots(document_id, version_number DESC);

-- ============================================================================
-- SSO / SAML: relay states for CSRF protection on ACS
-- ============================================================================
CREATE TABLE IF NOT EXISTS saml_relay_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES saml_providers(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saml_relay_states_relay_state ON saml_relay_states(relay_state);
CREATE INDEX IF NOT EXISTS idx_saml_relay_states_expires_at ON saml_relay_states(expires_at);

ALTER TABLE saml_relay_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own relay states" ON saml_relay_states
  FOR ALL USING (auth.uid() = user_id);

