-- Add notification_preferences table for storing per-user notification settings.
-- Referenced by src/app/actions/settings.ts (updateNotificationPreferences).
-- This table was missing, causing notification preference saves to fail with a 500.

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email_notifications JSONB DEFAULT '{}',
    push_notifications JSONB DEFAULT '{}',
    in_app_notifications JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
    ON notification_preferences FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
