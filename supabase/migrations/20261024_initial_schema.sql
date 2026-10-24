-- Initial Schema Migration for Tech Opportunity Tracker
-- Supports Supabase / PostgreSQL open-source database

-- 1. Opportunities Table
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'hackathon' | 'conference' | 'workshop' | 'internship' | 'job'
  conference_tier TEXT, -- 'Core A*' | 'Core A' | 'Core B' | 'Core C' | 'Industry / Non-Academic'
  organizer TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  submission_deadline TEXT,
  format TEXT NOT NULL DEFAULT 'online', -- 'online' | 'in-person' | 'hybrid'
  location TEXT,
  source_url TEXT NOT NULL,
  description TEXT NOT NULL,
  discovery_confidence TEXT NOT NULL DEFAULT 'low', -- 'high' | 'low'
  confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'needs_review', -- 'published' | 'needs_review' | 'archived'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_by TEXT,
  contributors JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Provenance (Problem 2)
  origin TEXT NOT NULL DEFAULT 'adapter', -- 'adapter' | 'user_submitted' | 'admin_entered' | 'ai_extracted'
  approved_by TEXT,
  approved_at TEXT,
  approval_basis TEXT,

  -- Job listings (Problem 5)
  company TEXT,
  posted_date TEXT,
  application_deadline TEXT,
  link_status TEXT NOT NULL DEFAULT 'unknown', -- 'ok' | 'unreachable' | 'unknown'
  last_checked_at TEXT,
  listing_status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed' | 'expired' | 'stale'
  work_mode TEXT
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_start_date ON opportunities(start_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company);

-- 2. Pipeline Logs Table
CREATE TABLE IF NOT EXISTS pipeline_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'failed' | 'running'
  events_scanned INTEGER NOT NULL DEFAULT 0,
  events_added INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  events_archived INTEGER NOT NULL DEFAULT 0,
  low_confidence_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_timestamp ON pipeline_logs(timestamp DESC);

-- 3. Profiles / Roles Table (Problem 8)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'moderator' | 'admin'
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 4. User Interactions Table (Row-level isolation)
CREATE TABLE IF NOT EXISTS user_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  starred BOOLEAN NOT NULL DEFAULT false,
  participating BOOLEAN NOT NULL DEFAULT false,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);

-- 5. Notification Preferences (Problem 7)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  categories JSONB NOT NULL DEFAULT '["hackathon","conference","workshop","internship","job"]'::jsonb,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL
);

-- 6. User Updates List (Problem 7)
CREATE TABLE IF NOT EXISTS user_updates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_opportunity' | 'deadline_change' | 'deadline_approaching'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_updates_user_id ON user_updates(user_id, read);

-- 7. Notifications Log (Deduplicated, Problem 7)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'in_app' | 'email'
  event_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'sent' | 'failed' | 'pending'
  error TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, event_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, channel);

-- 8. Role Audit Logs (Problem 8)
CREATE TABLE IF NOT EXISTS role_audit_logs (
  id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- Enable Row Level Security (RLS) on sensitive tables
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only read and write their own interactions
CREATE POLICY user_interactions_policy ON user_interactions
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY notification_preferences_policy ON notification_preferences
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY user_updates_policy ON user_updates
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
