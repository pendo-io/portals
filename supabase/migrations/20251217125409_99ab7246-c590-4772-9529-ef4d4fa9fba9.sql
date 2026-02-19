-- 1. Add policy to deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon 
USING (false);

-- 2. Add RLS policies to workflows_public view
-- First check if RLS is enabled on the view (views inherit from base table)
-- Since workflows_public is a view, we need to ensure it only shows public data
-- Views don't have RLS directly - they inherit from underlying tables
-- The workflows table already has proper RLS, so workflows_public should be safe
-- But we should add explicit policies for the view if it's a table

-- If workflows_public is actually a table (not a view), enable RLS and add policies
DO $$
BEGIN
  -- Check if workflows_public is a table (not a view)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workflows_public') THEN
    EXECUTE 'ALTER TABLE public.workflows_public ENABLE ROW LEVEL SECURITY';
    
    -- Allow authenticated users to view active workflows
    EXECUTE 'CREATE POLICY "Authenticated users can view active public workflows" ON public.workflows_public FOR SELECT TO authenticated USING (is_active = true)';
    
    -- Deny anonymous access
    EXECUTE 'CREATE POLICY "Deny anonymous access to workflows_public" ON public.workflows_public FOR SELECT TO anon USING (false)';
  END IF;
END $$;