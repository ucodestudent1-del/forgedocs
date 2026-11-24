-- up ---
-- Multi-account tenant isolation (additive; preserves existing user-scoped resources)
-- Migration: 20261124020000_add_account_tenancy

-- Accounts (organizations/workspaces). One user can belong to many accounts.
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'canceled')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership links users to accounts with a role.
CREATE TABLE IF NOT EXISTS account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

-- Invitations let owners/admins add members to an account.
CREATE TABLE IF NOT EXISTS account_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SQL helper used by RLS policies to test membership.
CREATE OR REPLACE FUNCTION is_account_member(p_account_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE account_id = p_account_id AND user_id = p_user_id
  );
$$ LANGUAGE sql STABLE;

-- Attach an optional account relationship to every account-owned resource.
-- Null account_id = personal resource owned solely by user_id (backward compatible).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE conversion_jobs ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Indexes for tenant-scoped lookups.
CREATE INDEX IF NOT EXISTS idx_documents_account_id ON documents(account_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_account ON documents(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON account_members(account_id);
CREATE INDEX IF NOT EXISTS idx_account_members_user_id ON account_members(user_id);
CREATE INDEX IF NOT EXISTS idx_account_invitations_token ON account_invitations(token);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);

-- RLS on new account tables.
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their accounts" ON accounts FOR SELECT
  USING (auth.uid() = owner_id OR is_account_member(id, auth.uid()));

CREATE POLICY "Owners and admins manage accounts" ON accounts FOR ALL
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM account_members am
      WHERE am.account_id = accounts.id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can view account members" ON account_members FOR SELECT
  USING (is_account_member(account_id, auth.uid()));

CREATE POLICY "Owners and admins manage account members" ON account_members FOR ALL
  USING (
    is_account_member(account_id, auth.uid()) AND
    EXISTS (
      SELECT 1 FROM account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Recipient or account members can view invitations" ON account_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    is_account_member(account_id, auth.uid())
  );

-- Extend existing resource policies so account members can access account resources,
-- while personal resources (account_id IS NULL) remain owned by user_id.

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

CREATE POLICY "Owner or account members can view documents" ON documents FOR SELECT
  USING (auth.uid() = user_id OR (account_id IS NOT NULL AND is_account_member(account_id, auth.uid())));

CREATE POLICY "Owner can insert documents" ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (account_id IS NULL OR is_account_member(account_id, auth.uid())));

CREATE POLICY "Owner or account members can update documents" ON documents FOR UPDATE
  USING (auth.uid() = user_id OR (account_id IS NOT NULL AND is_account_member(account_id, auth.uid())));

CREATE POLICY "Owner or account members can delete documents" ON documents FOR DELETE
  USING (auth.uid() = user_id OR (account_id IS NOT NULL AND is_account_member(account_id, auth.uid())));

DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Owner or account members can view subscriptions" ON subscriptions FOR SELECT
  USING (auth.uid() = user_id OR (account_id IS NOT NULL AND is_account_member(account_id, auth.uid())));

-- --- down ---
DROP POLICY IF EXISTS "Owner or account members can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owner or account members can delete documents" ON documents;
DROP POLICY IF EXISTS "Owner or account members can update documents" ON documents;
DROP POLICY IF EXISTS "Owner can insert documents" ON documents;
DROP POLICY IF EXISTS "Owner or account members can view documents" ON documents;
DROP POLICY IF EXISTS "Recipient or account members can view invitations" ON account_invitations;
DROP POLICY IF EXISTS "Owners and admins manage account members" ON account_members;
DROP POLICY IF EXISTS "Members can view account members" ON account_members;
DROP POLICY IF EXISTS "Owners and admins manage accounts" ON accounts;
DROP POLICY IF EXISTS "Members can view their accounts" ON accounts;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_invitations DISABLE ROW LEVEL SECURITY;
DROP FUNCTION IF EXISTS is_account_member(UUID, UUID);
ALTER TABLE usage_records DROP COLUMN IF EXISTS account_id;
ALTER TABLE conversion_jobs DROP COLUMN IF EXISTS account_id;
ALTER TABLE webhooks DROP COLUMN IF EXISTS account_id;
ALTER TABLE api_keys DROP COLUMN IF EXISTS account_id;
ALTER TABLE signature_requests DROP COLUMN IF EXISTS account_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS account_id;
ALTER TABLE documents DROP COLUMN IF EXISTS account_id;
DROP TABLE IF EXISTS account_invitations CASCADE;
DROP TABLE IF EXISTS account_members CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
