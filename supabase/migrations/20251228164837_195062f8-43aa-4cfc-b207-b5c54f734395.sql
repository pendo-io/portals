-- Add RLS policy to workflows_public view
-- Note: Views inherit RLS from underlying tables, but we need to ensure the view is secured
-- The workflows_public view should only be accessible to authenticated users

-- First, let's enable RLS on the view
ALTER VIEW public.workflows_public SET (security_invoker = on);

-- Add database-level email domain validation in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce @pendo.io email domain
  IF NEW.email NOT LIKE '%@pendo.io' THEN
    RAISE EXCEPTION 'Only pendo.io email addresses are allowed';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Insert default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Add constraint on profiles table to enforce domain
-- (This provides a second layer of defense)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS email_domain_check;
ALTER TABLE public.profiles ADD CONSTRAINT email_domain_check CHECK (email LIKE '%@pendo.io');

-- Update RLS policy on profiles to include domain check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  AND email LIKE '%@pendo.io'
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  AND email LIKE '%@pendo.io'
);