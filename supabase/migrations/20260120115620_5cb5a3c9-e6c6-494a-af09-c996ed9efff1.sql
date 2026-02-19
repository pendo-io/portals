-- Create table for storing account intelligence reports
CREATE TABLE public.account_intelligence_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_name text NOT NULL,
  client_website text NOT NULL,
  salesforce_id text,
  report_type text NOT NULL CHECK (report_type IN ('overview', 'strategic', 'value', 'strategy')),
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.account_intelligence_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own reports
CREATE POLICY "Users can view own account intelligence reports" 
ON public.account_intelligence_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own account intelligence reports" 
ON public.account_intelligence_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account intelligence reports" 
ON public.account_intelligence_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own account intelligence reports" 
ON public.account_intelligence_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Super admins can view all reports
CREATE POLICY "Super admins can view all account intelligence reports" 
ON public.account_intelligence_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Trigger for updating updated_at timestamp
CREATE TRIGGER update_account_intelligence_reports_updated_at
BEFORE UPDATE ON public.account_intelligence_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_account_intelligence_reports_user_id ON public.account_intelligence_reports(user_id);
CREATE INDEX idx_account_intelligence_reports_client_name ON public.account_intelligence_reports(client_name);