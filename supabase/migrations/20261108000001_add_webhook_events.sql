-- Webhook events table for idempotency
-- Migration: 20261108000001_add_webhook_events

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (webhooks use service role)
CREATE POLICY "Service role can insert webhook events" ON webhook_events
  FOR INSERT WITH CHECK (true);

-- Users cannot access webhook events directly
CREATE POLICY "No direct access to webhook events" ON webhook_events
  FOR SELECT USING (false);

-- Index for idempotency lookups
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Add missing columns to conversion_jobs
ALTER TABLE conversion_jobs
ADD COLUMN IF NOT EXISTS output_mime_type TEXT,
ADD COLUMN IF NOT EXISTS output_size BIGINT;

-- Add unique constraint on usage_records per user/metric/period
-- This prevents duplicate usage tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_records_unique
  ON usage_records(user_id, metric, recorded_at)
  WHERE recorded_at >= date_trunc('day', NOW());