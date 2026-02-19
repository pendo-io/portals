-- Create table to track Ask Will conversations
CREATE TABLE public.ask_will_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_query TEXT NOT NULL,
  assistant_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ask_will_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own ask_will_messages"
ON public.ask_will_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own ask_will_messages"
ON public.ask_will_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super admins can view all messages for analytics
CREATE POLICY "Super admins can view all ask_will_messages"
ON public.ask_will_messages
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Create index for faster lookups
CREATE INDEX idx_ask_will_messages_user_id ON public.ask_will_messages(user_id);
CREATE INDEX idx_ask_will_messages_created_at ON public.ask_will_messages(created_at);