-- up ---
-- Add RLS to tier_limits table (configuration data - read-only for users)
ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view tier limits (read-only configuration)
CREATE POLICY "Users can view tier limits" ON tier_limits FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only service role can insert/update tier limits (handled server-side via service client)
-- No user-facing insert/update/delete policies

-- down ---
DROP POLICY IF EXISTS "Users can view tier limits" ON tier_limits;
ALTER TABLE tier_limits DISABLE ROW LEVEL SECURITY;
