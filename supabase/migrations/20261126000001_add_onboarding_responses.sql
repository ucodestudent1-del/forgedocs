-- Add onboarding_responses column to profiles to persist onboarding answers
-- (personalization name, usage purpose, workspace type) without creating a new table.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_responses JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
