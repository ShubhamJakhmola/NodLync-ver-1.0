-- NodLync Database Performance Indexes
-- These indexes optimize frequent lookups by user_id, project_id, and sorting by date.

-- Generic Tables (User based)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_links_user_id ON meeting_links(user_id);
CREATE INDEX IF NOT EXISTS idx_my_stuff_categories_user_id ON my_stuff_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_my_stuff_items_user_id ON my_stuff_items(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_items_user_id ON api_key_items("UserId");
CREATE INDEX IF NOT EXISTS idx_liked_ideas_user_id ON liked_ideas("user_id");

-- Project Specific Tables
-- Note: Replace 'tasks' with 'task_items' as used in current schema.
CREATE INDEX IF NOT EXISTS idx_task_items_project_id ON task_items(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_project_id ON project_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

-- Sorting by Date (Descending for most recent)
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_items_created_at ON task_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_logs_created_at ON project_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_created_at ON milestones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_links_scheduled_at ON meeting_links(scheduled_at DESC);
