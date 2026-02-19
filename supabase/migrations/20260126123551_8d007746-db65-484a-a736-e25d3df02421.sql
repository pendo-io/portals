-- Create table to track Account Intelligence API usage
CREATE TABLE public.account_intelligence_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.account_intelligence_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  
  -- OpenAI usage
  openai_calls INTEGER NOT NULL DEFAULT 0,
  openai_input_tokens INTEGER NOT NULL DEFAULT 0,
  openai_output_tokens INTEGER NOT NULL DEFAULT 0,
  openai_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  
  -- Gemini usage  
  gemini_calls INTEGER NOT NULL DEFAULT 0,
  gemini_input_tokens INTEGER NOT NULL DEFAULT 0,
  gemini_output_tokens INTEGER NOT NULL DEFAULT 0,
  gemini_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  
  -- Google Custom Search usage
  google_search_calls INTEGER NOT NULL DEFAULT 0,
  google_search_results INTEGER NOT NULL DEFAULT 0,
  google_search_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  
  -- Serper usage
  serper_calls INTEGER NOT NULL DEFAULT 0,
  serper_results INTEGER NOT NULL DEFAULT 0,
  serper_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  
  -- RAG embedding usage
  embedding_calls INTEGER NOT NULL DEFAULT 0,
  embedding_tokens INTEGER NOT NULL DEFAULT 0,
  embedding_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  
  -- Totals
  total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  generation_time_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_intelligence_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
ON public.account_intelligence_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Super admins can view all usage
CREATE POLICY "Super admins can view all usage"
ON public.account_intelligence_usage
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Service role can insert (edge functions)
CREATE POLICY "Service can insert usage"
ON public.account_intelligence_usage
FOR INSERT
WITH CHECK (true);

-- Add index for analytics queries
CREATE INDEX idx_usage_created_at ON public.account_intelligence_usage(created_at DESC);
CREATE INDEX idx_usage_user_id ON public.account_intelligence_usage(user_id);
CREATE INDEX idx_usage_report_type ON public.account_intelligence_usage(report_type);