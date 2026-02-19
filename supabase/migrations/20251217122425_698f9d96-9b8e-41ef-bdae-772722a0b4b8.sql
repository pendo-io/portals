-- Create table for Ask Will Reasoning (deep analysis) messages
CREATE TABLE public.ask_will_reasoning_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_query TEXT NOT NULL,
  assistant_response TEXT
);

-- Enable Row Level Security
ALTER TABLE public.ask_will_reasoning_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own reasoning messages
CREATE POLICY "Users can view own ask_will_reasoning_messages"
ON public.ask_will_reasoning_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reasoning messages
CREATE POLICY "Users can insert own ask_will_reasoning_messages"
ON public.ask_will_reasoning_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super admins can view all reasoning messages
CREATE POLICY "Super admins can view all ask_will_reasoning_messages"
ON public.ask_will_reasoning_messages
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));