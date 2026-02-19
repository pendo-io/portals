-- Add status column to workflow_runs
ALTER TABLE public.workflow_runs 
ADD COLUMN status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure'));

-- Add error_message column for failures
ALTER TABLE public.workflow_runs 
ADD COLUMN error_message TEXT;