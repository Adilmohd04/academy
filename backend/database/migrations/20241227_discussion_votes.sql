-- Create discussion_votes table to support upvote/downvote functionality
-- This replaces the old discussion_upvotes table with a more flexible vote system

-- Create the new table
CREATE TABLE IF NOT EXISTS discussion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(discussion_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion_id ON discussion_votes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_user_id ON discussion_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_type ON discussion_votes(vote_type);

-- Migrate existing upvotes from discussion_upvotes table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discussion_upvotes') THEN
    INSERT INTO discussion_votes (discussion_id, user_id, vote_type, created_at)
    SELECT discussion_id, user_id, 'up', created_at
    FROM discussion_upvotes
    ON CONFLICT (discussion_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Add RLS policies
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view votes
CREATE POLICY "Anyone can view votes" ON discussion_votes
  FOR SELECT USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Users can insert own votes" ON discussion_votes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes" ON discussion_votes
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON discussion_votes
  FOR DELETE USING (auth.uid()::text = user_id);

-- Drop old upvotes column from course_discussions if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_discussions' 
    AND column_name = 'upvotes'
  ) THEN
    ALTER TABLE course_discussions DROP COLUMN upvotes;
  END IF;
END $$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discussion_votes_updated_at
  BEFORE UPDATE ON discussion_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE discussion_votes IS 'Stores upvote/downvote data for course discussions and replies';
COMMENT ON COLUMN discussion_votes.vote_type IS 'Either "up" for upvote or "down" for downvote';
