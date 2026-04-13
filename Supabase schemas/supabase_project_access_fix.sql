-- Fix shared project visibility for invited teammates.
-- Run this in the Supabase SQL editor before testing teammate access in production.

ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_can_access_project(p_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE id = p_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members
      WHERE project_id = p_id
        AND user_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Projects select access" ON public.projects;
CREATE POLICY "Projects select access"
ON public.projects
FOR SELECT
USING (public.user_can_access_project(id));

DROP POLICY IF EXISTS "Projects insert own" ON public.projects;
CREATE POLICY "Projects insert own"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Projects update shared access" ON public.projects;
CREATE POLICY "Projects update shared access"
ON public.projects
FOR UPDATE
USING (public.user_can_access_project(id))
WITH CHECK (public.user_can_access_project(id));

DROP POLICY IF EXISTS "Projects delete owner only" ON public.projects;
CREATE POLICY "Projects delete owner only"
ON public.projects
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = id
      AND p.user_id = auth.uid()
  )
);

NOTIFY pgrst, reload_schema;
