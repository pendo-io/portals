
-- Fix profiles table RLS - users should only see their own profile, not all pendo.io profiles
-- Drop existing policies and recreate with proper restrictions

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Super admins can still view all profiles (this is intentional for admin functionality)
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- For workflows_public view - it already has SECURITY INVOKER enabled which means it inherits 
-- RLS from the underlying workflows table. The workflows table already has proper RLS.
-- We just need to add a comment to clarify this is intentional.
COMMENT ON VIEW public.workflows_public IS 'Public view of workflows table. Uses SECURITY INVOKER to inherit RLS from workflows table. Only shows non-sensitive columns (excludes webhook_url and publish_status).';
