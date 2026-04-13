-- captured_requests table
CREATE TABLE IF NOT EXISTS captured_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL,
  url text NOT NULL,
  domain text,
  headers jsonb DEFAULT '{}'::jsonb,
  request_headers jsonb DEFAULT '{}'::jsonb,
  response_headers jsonb DEFAULT '{}'::jsonb,
  body jsonb,
  response_body jsonb,
  status integer,
  duration float,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE captured_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own captured requests"
  ON captured_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own captured requests"
  ON captured_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own captured requests"
  ON captured_requests FOR DELETE
  USING (auth.uid() = user_id);

-- api_history table
CREATE TABLE IF NOT EXISTS api_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  method text NOT NULL,
  url text NOT NULL,
  headers jsonb DEFAULT '{}'::jsonb,
  body jsonb,
  response_preview text,
  status_code integer,
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api history"
  ON api_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api history"
  ON api_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api history"
  ON api_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api history"
  ON api_history FOR DELETE
  USING (auth.uid() = user_id);

-- Check if publication exists before trying to create it
-- Or just add the table to the existing realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE captured_requests;
  END IF;
END $$;
