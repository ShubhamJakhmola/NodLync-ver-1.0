-- Create a secure RPC function to delete a user account and all their data
-- This runs with SECURITY DEFINER to bypass RLS and delete the user from auth.users

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_uid UUID;
BEGIN
    -- Get the UID of the user executing this function
    target_uid := auth.uid();

    -- Ensure the user is actually authenticated
    IF target_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Safely attempt to delete from known tables. 
    -- If a table doesn't exist, it simply ignores the error and moves on.
    BEGIN DELETE FROM public.api_keys WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.workflows_v2 WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.projects WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.my_stuff_categories WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.app_settings WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.app_logs WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- Delete the user profile last
    BEGIN DELETE FROM public.user_profiles WHERE id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Finally, delete the user from Supabase Auth (this usually triggers ON DELETE CASCADE for any remaining tables)
    DELETE FROM auth.users WHERE id = target_uid;

END;
$$;
