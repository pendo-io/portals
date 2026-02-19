-- Add last_login to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create workflow_runs table to track each workflow execution
CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  form_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own runs
CREATE POLICY "Users can view own workflow runs"
ON public.workflow_runs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own runs
CREATE POLICY "Users can insert own workflow runs"
ON public.workflow_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super admins can view all runs
CREATE POLICY "Super admins can view all workflow runs"
ON public.workflow_runs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create function to update last_login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger for auth.users sign in (on profiles since we can't trigger on auth.users)
-- We'll update last_login via the app when user logs in instead