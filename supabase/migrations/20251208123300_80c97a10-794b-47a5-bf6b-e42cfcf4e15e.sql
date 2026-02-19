-- Fix workflow_runs RLS policies - change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own workflow runs" ON public.workflow_runs;
DROP POLICY IF EXISTS "Super admins can view all workflow runs" ON public.workflow_runs;
DROP POLICY IF EXISTS "Users can insert own workflow runs" ON public.workflow_runs;

-- Create PERMISSIVE policies (default behavior allows OR logic)
CREATE POLICY "Users can view own workflow runs" 
ON public.workflow_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all workflow runs" 
ON public.workflow_runs 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert own workflow runs" 
ON public.workflow_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);