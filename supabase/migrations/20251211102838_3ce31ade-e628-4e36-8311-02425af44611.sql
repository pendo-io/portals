-- Drop and recreate the workflows_public view with SECURITY INVOKER
-- This ensures the view respects the RLS policies on the underlying workflows table

DROP VIEW IF EXISTS public.workflows_public;

CREATE VIEW public.workflows_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_by,
  created_at,
  updated_at,
  is_active,
  long_description,
  category,
  stage,
  roles,
  workflow_type,
  original_id,
  title,
  description
FROM public.workflows;