-- Fix profiles table RLS - restrict public access while maintaining necessary functionality
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Super admins can view all profiles (needed for user management)
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles table RLS - restrict public access
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- Users can view their own role
CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Super admins can view all roles (needed for user management)
CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));