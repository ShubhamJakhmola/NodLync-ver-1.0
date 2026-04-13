-- Team Management and Project Structure Migration (Relationship Fix)

-- 1. Correct Foreign Key Relationship
-- If table already exists, we ensure user_id points to user_profiles for Postgrest joins
ALTER TABLE IF EXISTS project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Note: If table exists, manually ensure the user_id points to user_profiles.id 
-- This enables Supabase to perform: .select("*, user_profiles(display_name)")

-- 2. Security functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION check_project_access(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM projects WHERE id = p_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = p_id AND user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_management_authority(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM projects WHERE id = p_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = p_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Polices for project_members
DROP POLICY IF EXISTS "Select Access" ON project_members;
DROP POLICY IF EXISTS "Insert Access" ON project_members;
DROP POLICY IF EXISTS "Modify Access" ON project_members;
DROP POLICY IF EXISTS "Delete Access" ON project_members;

CREATE POLICY "Select Access" ON project_members FOR SELECT USING (check_project_access(project_id));
CREATE POLICY "Insert Access" ON project_members FOR INSERT WITH CHECK (check_management_authority(project_id));
CREATE POLICY "Modify Access" ON project_members FOR UPDATE USING (check_management_authority(project_id));
CREATE POLICY "Delete Access" ON project_members FOR DELETE USING (check_management_authority(project_id));

-- 5. User Profiles Policy (Search)
DROP POLICY IF EXISTS "Global profile search" ON user_profiles;
CREATE POLICY "Global profile search" ON user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
