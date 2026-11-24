--- up ---
-- Usage records table for metered billing (aligns with TypeScript types)

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric ON usage_records(metric);
CREATE INDEX IF NOT EXISTS idx_usage_records_recorded_at ON usage_records(recorded_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_records_unique ON usage_records(user_id, metric, recorded_at)
    WHERE recorded_at >= date_trunc('day', NOW());

--- down ---
DROP TABLE IF EXISTS usage_records CASCADE;
