-- Add publish_status column to workflows table
ALTER TABLE public.workflows 
ADD COLUMN publish_status text NOT NULL DEFAULT 'staging' 
CHECK (publish_status IN ('staging', 'production'));

-- Update existing workflows to production
UPDATE public.workflows SET publish_status = 'production';

-- Drop the old SELECT policy for regular users and create new one that filters by publish_status
DROP POLICY IF EXISTS "Authenticated users can view active workflows without webhook" ON public.workflows;

CREATE POLICY "Authenticated users can view active production workflows" 
ON public.workflows 
FOR SELECT 
USING (
  (is_active = true AND publish_status = 'production' AND auth.uid() IS NOT NULL)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);