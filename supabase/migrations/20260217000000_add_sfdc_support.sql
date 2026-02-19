-- Migration: Add Salesforce OAuth support
-- Removes pendo.io email domain restrictions and adds SFDC metadata

-- 1. Drop email_domain_check constraint on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS email_domain_check;

-- 2. Replace handle_new_user() trigger to remove @pendo.io enforcement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- 3. Add SFDC columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salesforce_user_id TEXT,
  ADD COLUMN IF NOT EXISTS salesforce_org_id TEXT,
  ADD COLUMN IF NOT EXISTS salesforce_instance_url TEXT;

-- 4. Create sfdc_tokens table
CREATE TABLE IF NOT EXISTS public.sfdc_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  instance_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on sfdc_tokens
ALTER TABLE public.sfdc_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "Users can view own sfdc_tokens"
ON public.sfdc_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role handles INSERT/UPDATE (edge functions use service role)
-- No INSERT/UPDATE policy for authenticated users - only service_role bypasses RLS

-- 5. Update RLS policies on profiles to remove email domain check
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

-- Ensure super admin policy still exists
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
