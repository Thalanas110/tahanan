-- Add is_deactivated to profiles
ALTER TABLE public.profiles ADD COLUMN is_deactivated BOOLEAN NOT NULL DEFAULT false;

-- Create an RPC to safely delete the authenticated user's account
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user id
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users (this cascades to profiles and other data depending on foreign keys)
  -- Note: Supabase auth.users deletion typically cascades to public tables if FKs are set to CASCADE
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
