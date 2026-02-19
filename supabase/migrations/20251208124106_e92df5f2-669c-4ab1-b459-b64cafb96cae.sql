-- Create a view that hides webhook_url from regular users
CREATE OR REPLACE VIEW public.workflows_public AS
SELECT 
  id,
  original_id,
  title,
  description,
  long_description,
  category,
  stage,
  roles,
  workflow_type,
  created_by,
  created_at,
  updated_at,
  is_active
FROM public.workflows;

-- Grant access to the view
GRANT SELECT ON public.workflows_public TO authenticated;

-- Update the workflows table policy to only allow super_admins to see webhook URLs
DROP POLICY IF EXISTS "Authenticated users can view active workflows" ON public.workflows;

-- Only super admins can view full workflow data including webhook URLs
CREATE POLICY "Super admins can view all workflow data" 
ON public.workflows 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));