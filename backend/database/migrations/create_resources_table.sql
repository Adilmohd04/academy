-- Create resources table for teacher uploads
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) CHECK (type IN ('pdf', 'document', 'image', 'video', 'audio', 'link', 'other')),
  url TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_by TEXT NOT NULL, -- Clerk user ID
  parent_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resources_created_by ON resources(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_parent ON resources(parent_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at_trigger
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();
