-- Add original_id column for hardcoded workflow IDs
ALTER TABLE public.workflows ADD COLUMN original_id TEXT;

-- Add unique constraint to prevent duplicates
CREATE UNIQUE INDEX workflows_original_id_idx ON public.workflows (original_id) WHERE original_id IS NOT NULL;

-- Update RLS to allow all authenticated users to view active workflows
DROP POLICY IF EXISTS "Super admins can view all workflows" ON public.workflows;

CREATE POLICY "Authenticated users can view active workflows" 
ON public.workflows 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Super admins can view all workflows including inactive" 
ON public.workflows 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));