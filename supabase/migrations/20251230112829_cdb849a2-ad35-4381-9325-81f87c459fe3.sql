
-- Fix RLS policies on profiles table
-- Convert main access policies to PERMISSIVE (default) so they grant access
-- Keep denial policies as RESTRICTIVE to add restrictions

-- Drop and recreate profiles policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  AND email LIKE '%@pendo.io'
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = id 
  AND email LIKE '%@pendo.io'
);

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Remove the restrictive deny policy - it's redundant with proper PERMISSIVE policies
-- and causes issues. The PERMISSIVE policies already restrict to authenticated users only.
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Fix RLS policies on ask_will_messages table
DROP POLICY IF EXISTS "Users can view own ask_will_messages" ON public.ask_will_messages;
CREATE POLICY "Users can view own ask_will_messages" 
ON public.ask_will_messages 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ask_will_messages" ON public.ask_will_messages;
CREATE POLICY "Users can insert own ask_will_messages" 
ON public.ask_will_messages 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all ask_will_messages" ON public.ask_will_messages;
CREATE POLICY "Super admins can view all ask_will_messages" 
ON public.ask_will_messages 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix RLS policies on ask_will_reasoning_messages table
DROP POLICY IF EXISTS "Users can view own ask_will_reasoning_messages" ON public.ask_will_reasoning_messages;
CREATE POLICY "Users can view own ask_will_reasoning_messages" 
ON public.ask_will_reasoning_messages 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ask_will_reasoning_messages" ON public.ask_will_reasoning_messages;
CREATE POLICY "Users can insert own ask_will_reasoning_messages" 
ON public.ask_will_reasoning_messages 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all ask_will_reasoning_messages" ON public.ask_will_reasoning_messages;
CREATE POLICY "Super admins can view all ask_will_reasoning_messages" 
ON public.ask_will_reasoning_messages 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
