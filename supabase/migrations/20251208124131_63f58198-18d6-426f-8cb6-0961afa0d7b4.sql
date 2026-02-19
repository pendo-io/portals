-- Fix the view to use security invoker instead of security definer
DROP VIEW IF EXISTS public.workflows_public;

CREATE VIEW public.workflows_public 
WITH (security_invoker = true) AS
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
FROM public.workflows
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.workflows_public TO authenticated;