-- ============================================
-- NOTIFICATION SYSTEM - COMPREHENSIVE SCHEMA
-- ============================================
-- In-app notification center for all user activities

-- ============================================
-- 1. USER NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'enrollment', 'content', 'resource', 'live_session', 'recording',
    'quiz', 'assignment', 'grade', 'certificate', 'announcement',
    'discussion', 'mention', 'payment', 'deadline', 'reminder', 'system'
  )),
  category VARCHAR(50) NOT NULL CHECK (category IN ('success', 'info', 'warning', 'error', 'activity')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to related resource
  icon VARCHAR(50), -- Icon identifier
  related_id UUID, -- ID of related resource (course_id, lesson_id, etc.)
  related_type VARCHAR(50), -- Type of related resource
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- Optional expiration date
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON user_notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON user_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE, -- Clerk user ID
  
  -- In-app notification settings
  enable_enrollment_notifications BOOLEAN DEFAULT TRUE,
  enable_content_notifications BOOLEAN DEFAULT TRUE,
  enable_resource_notifications BOOLEAN DEFAULT TRUE,
  enable_live_session_notifications BOOLEAN DEFAULT TRUE,
  enable_recording_notifications BOOLEAN DEFAULT TRUE,
  enable_quiz_notifications BOOLEAN DEFAULT TRUE,
  enable_assignment_notifications BOOLEAN DEFAULT TRUE,
  enable_grade_notifications BOOLEAN DEFAULT TRUE,
  enable_certificate_notifications BOOLEAN DEFAULT TRUE,
  enable_announcement_notifications BOOLEAN DEFAULT TRUE,
  enable_discussion_notifications BOOLEAN DEFAULT TRUE,
  enable_mention_notifications BOOLEAN DEFAULT TRUE,
  enable_payment_notifications BOOLEAN DEFAULT TRUE,
  enable_deadline_notifications BOOLEAN DEFAULT TRUE,
  enable_reminder_notifications BOOLEAN DEFAULT TRUE,
  enable_system_notifications BOOLEAN DEFAULT TRUE,
  
  -- Email notification settings (for future use)
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  email_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  
  -- Push notification settings (for future use)
  enable_push_notifications BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- ============================================
-- 3. NOTIFICATION TEMPLATES TABLE (Optional)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title_template VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,
  icon VARCHAR(50),
  default_link_pattern TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default notification templates
INSERT INTO notification_templates (template_key, type, category, title_template, message_template, icon) VALUES
  ('enrollment_success', 'enrollment', 'success', 'Successfully enrolled in {{course_name}}', 'You have been enrolled in {{course_name}}. Start learning now!', 'check-circle'),
  ('content_added', 'content', 'info', 'New content in {{course_name}}', 'Week {{week_number}}: {{content_title}} has been added to {{course_name}}.', 'book'),
  ('resource_uploaded', 'resource', 'info', 'New resource in {{course_name}}', '{{resource_title}} has been uploaded to {{course_name}}.', 'file'),
  ('live_session_scheduled', 'live_session', 'info', 'Live session scheduled', '{{session_title}} is scheduled for {{session_date}}.', 'video'),
  ('recording_available', 'recording', 'success', 'Recording available', 'Recording for {{session_title}} is now available.', 'play-circle'),
  ('quiz_published', 'quiz', 'info', 'New quiz available', '{{quiz_title}} is now available in {{course_name}}.', 'clipboard-list'),
  ('assignment_published', 'assignment', 'info', 'New assignment', '{{assignment_title}} has been published in {{course_name}}.', 'file-text'),
  ('grade_released', 'grade', 'success', 'Grade released', 'Your grade for {{item_title}} is now available.', 'star'),
  ('certificate_issued', 'certificate', 'success', 'Certificate issued', 'Congratulations! Your certificate for {{course_name}} is ready.', 'award'),
  ('announcement_posted', 'announcement', 'info', 'New announcement', '{{announcement_title}} in {{course_name}}.', 'megaphone'),
  ('discussion_reply', 'discussion', 'activity', 'New reply to your discussion', '{{user_name}} replied to your discussion: {{discussion_title}}.', 'message-circle'),
  ('mention_in_discussion', 'mention', 'activity', 'You were mentioned', '{{user_name}} mentioned you in {{discussion_title}}.', 'at-sign'),
  ('payment_success', 'payment', 'success', 'Payment successful', 'Your payment for {{course_name}} was successful.', 'credit-card'),
  ('deadline_approaching', 'deadline', 'warning', 'Deadline approaching', '{{item_title}} is due in {{hours_remaining}} hours.', 'clock'),
  ('reminder_notification', 'reminder', 'info', 'Reminder', '{{reminder_message}}', 'bell')
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- 4. NOTIFICATION STATS VIEW (Optional)
-- ============================================
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
  COUNT(*) FILTER (WHERE is_archived = TRUE) as archived_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as week_count,
  MAX(created_at) as last_notification_at
FROM user_notifications
GROUP BY user_id;

-- ============================================
-- 5. CLEANUP FUNCTION FOR EXPIRED NOTIFICATIONS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. AUTO-CLEANUP OLD READ NOTIFICATIONS (90 days)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_notifications IS 'In-app notifications for all user activities';
COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';
COMMENT ON TABLE notification_templates IS 'Reusable notification message templates';
