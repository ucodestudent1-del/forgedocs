-- up ---
-- Add missing RLS to tables that were created without it.
-- conversion_jobs, usage_records, template_versions were missing RLS entirely.
-- support_tickets had overly permissive insert/update policies (true for anyone).

ALTER TABLE conversion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversion jobs" ON conversion_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversion jobs" ON conversion_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversion jobs" ON conversion_jobs FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage records" ON usage_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage records" ON usage_records FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own template versions" ON template_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM templates WHERE id = template_versions.template_id AND (user_id = auth.uid() OR account_id IS NOT NULL AND EXISTS (SELECT 1 FROM account_members WHERE account_id = templates.account_id AND user_id = auth.uid())))
);

-- Tighten support_tickets: only authenticated users can insert their own tickets.
DROP POLICY IF EXISTS "Service role can insert support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Service role can update support tickets" ON support_tickets;
CREATE POLICY "Users can insert own support tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own support tickets" ON support_tickets FOR UPDATE USING (auth.uid() = user_id);

-- down ---
DROP POLICY IF EXISTS "Users can view own conversion jobs" ON conversion_jobs;
DROP POLICY IF EXISTS "Users can insert own conversion jobs" ON conversion_jobs;
DROP POLICY IF EXISTS "Users can update own conversion jobs" ON conversion_jobs;
ALTER TABLE conversion_jobs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage records" ON usage_records;
DROP POLICY IF EXISTS "Users can insert own usage records" ON usage_records;
ALTER TABLE usage_records DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own template versions" ON template_versions;
ALTER TABLE template_versions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own support tickets" ON support_tickets;
