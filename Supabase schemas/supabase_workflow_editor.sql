-- NodLync Unified Workflow Editor Migration

-- 1. Unified Workflows Table
-- workflow_type: 'visual' (React Flow) or 'imported' (n8n JSON)
CREATE TABLE IF NOT EXISTS workflows_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Workflow',
  workflow_type TEXT DEFAULT 'visual' CHECK (workflow_type IN ('visual', 'imported')),
  json_data JSONB DEFAULT '{}'::jsonb, -- Raw JSON content
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workflow Nodes (Only for 'visual' type)
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id TEXT PRIMARY KEY,
  workflow_id UUID REFERENCES workflows_v2(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workflow Edges (Only for 'visual' type)
CREATE TABLE IF NOT EXISTS workflow_edges (
  id TEXT PRIMARY KEY,
  workflow_id UUID REFERENCES workflows_v2(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  source_handle TEXT,
  target_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE workflows_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can manage their own workflows" ON workflows_v2;
CREATE POLICY "Users can manage their own workflows" ON workflows_v2
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own workflow nodes" ON workflow_nodes;
CREATE POLICY "Users can manage their own workflow nodes" ON workflow_nodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workflows_v2 WHERE id = workflow_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their own workflow edges" ON workflow_edges;
CREATE POLICY "Users can manage their own workflow edges" ON workflow_edges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workflows_v2 WHERE id = workflow_id AND user_id = auth.uid())
  );

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_wf_id ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_wf_id ON workflow_edges(workflow_id);
