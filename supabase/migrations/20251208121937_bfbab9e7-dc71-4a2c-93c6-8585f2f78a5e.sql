-- Create table for custom workflows
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  category TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  stage TEXT DEFAULT 'Research',
  roles TEXT[] NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('regular', 'salesforce-account', 'salesforce-opportunity')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Only super admins can view workflows
CREATE POLICY "Super admins can view all workflows" 
ON public.workflows 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Only super admins can create workflows
CREATE POLICY "Super admins can create workflows" 
ON public.workflows 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Only super admins can update workflows
CREATE POLICY "Super admins can update workflows" 
ON public.workflows 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'));

-- Only super admins can delete workflows
CREATE POLICY "Super admins can delete workflows" 
ON public.workflows 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();