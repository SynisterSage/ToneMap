-- Create contextual_suggestions table for auto-generated playlist suggestions
-- These are temporary playlists generated based on context changes
-- They expire after 24 hours and are replaced with new suggestions

CREATE TABLE IF NOT EXISTS contextual_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  playlist_data JSONB NOT NULL,
  context_snapshot JSONB NOT NULL,
  context_changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  viewed BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE
);

-- Index for querying user's suggestions
CREATE INDEX IF NOT EXISTS idx_contextual_suggestions_user ON contextual_suggestions(user_id);

-- Index for cleaning up expired suggestions
CREATE INDEX IF NOT EXISTS idx_contextual_suggestions_expires ON contextual_suggestions(expires_at);

-- Index for active suggestions
CREATE INDEX IF NOT EXISTS idx_contextual_suggestions_active ON contextual_suggestions(user_id, expires_at, dismissed);

-- Enable RLS
ALTER TABLE contextual_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own suggestions
CREATE POLICY "Users can view their own contextual suggestions"
  ON contextual_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own suggestions
CREATE POLICY "Users can create their own contextual suggestions"
  ON contextual_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own suggestions
CREATE POLICY "Users can update their own contextual suggestions"
  ON contextual_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own suggestions
CREATE POLICY "Users can delete their own contextual suggestions"
  ON contextual_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up expired suggestions (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_contextual_suggestions()
RETURNS void AS $$
BEGIN
  DELETE FROM contextual_suggestions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE contextual_suggestions IS 'Auto-generated playlist suggestions based on context changes';
