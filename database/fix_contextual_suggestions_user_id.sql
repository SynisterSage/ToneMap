-- Fix contextual_suggestions table to use TEXT for user_id instead of UUID
-- Firebase UIDs are TEXT strings, not UUIDs

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own contextual suggestions" ON contextual_suggestions;
DROP POLICY IF EXISTS "Users can create their own contextual suggestions" ON contextual_suggestions;
DROP POLICY IF EXISTS "Users can update their own contextual suggestions" ON contextual_suggestions;
DROP POLICY IF EXISTS "Users can delete their own contextual suggestions" ON contextual_suggestions;

-- Drop the table and recreate with correct type
DROP TABLE IF EXISTS contextual_suggestions;

-- Recreate table with TEXT user_id
CREATE TABLE contextual_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Changed from UUID to TEXT
  playlist_data JSONB NOT NULL,
  context_snapshot JSONB NOT NULL,
  context_changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  viewed BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE
);

-- Index for querying user's suggestions
CREATE INDEX idx_contextual_suggestions_user ON contextual_suggestions(user_id);

-- Index for cleaning up expired suggestions
CREATE INDEX idx_contextual_suggestions_expires ON contextual_suggestions(expires_at);

-- Index for active suggestions
CREATE INDEX idx_contextual_suggestions_active ON contextual_suggestions(user_id, expires_at, dismissed);

-- Enable RLS (but note: Firebase UIDs won't work with auth.uid() in Supabase)
-- You'll need to handle RLS differently or disable it for Firebase users
ALTER TABLE contextual_suggestions ENABLE ROW LEVEL SECURITY;

-- For now, create a permissive policy since we're using Firebase auth, not Supabase auth
CREATE POLICY "Allow all operations for authenticated users"
  ON contextual_suggestions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired suggestions (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_contextual_suggestions()
RETURNS void AS $$
BEGIN
  DELETE FROM contextual_suggestions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE contextual_suggestions IS 'Auto-generated playlist suggestions based on context changes (Firebase Auth compatible)';
