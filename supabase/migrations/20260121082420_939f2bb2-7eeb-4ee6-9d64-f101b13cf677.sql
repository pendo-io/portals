-- Fix the security definer view issue by recreating with security_invoker = true
DROP VIEW IF EXISTS public.workflows_public;

CREATE VIEW public.workflows_public 
WITH (security_invoker = true) AS
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
    original_id,
    public_slug
FROM workflows
WHERE (is_active = true) AND (publish_status = 'production'::text);