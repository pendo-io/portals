-- Recreate workflows_public view to include public_slug column
DROP VIEW IF EXISTS public.workflows_public;

CREATE VIEW public.workflows_public AS
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