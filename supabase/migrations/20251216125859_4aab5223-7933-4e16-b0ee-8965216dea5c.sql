-- Fix Security Issues

-- 1. Ensure RLS is enabled on profiles table (should already be, but confirm)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Ensure RLS is enabled on workflow_runs table
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- 3. For workflows_public view - drop and recreate with security_barrier
-- First check if it's a view and recreate with SECURITY_BARRIER
DROP VIEW IF EXISTS public.workflows_public;

CREATE VIEW public.workflows_public 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id,
  created_by,
  created_at,
  updated_at,
  is_active,
  description,
  title,
  long_description,
  category,
  stage,
  roles,
  workflow_type,
  original_id
FROM public.workflows
WHERE is_active = true AND publish_status = 'production';

-- 4. Force RLS for table owners (prevents bypassing RLS even for table owners)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ask_will_messages FORCE ROW LEVEL SECURITY;

-- 5. Revoke public access from all tables to ensure only authenticated access
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.workflow_runs FROM anon;
REVOKE ALL ON public.workflows FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.ask_will_messages FROM anon;
REVOKE ALL ON public.workflows_public FROM anon;

-- Grant only to authenticated users (RLS policies will further restrict)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.workflow_runs TO authenticated;
GRANT SELECT ON public.workflows TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT ON public.ask_will_messages TO authenticated;
GRANT SELECT ON public.workflows_public TO authenticated;