-- Fix the overly permissive INSERT policy for account_intelligence_usage
-- Drop the existing policy and create a more restrictive one
DROP POLICY IF EXISTS "Service can insert usage" ON public.account_intelligence_usage;

-- Allow inserts where user_id matches the authenticated user OR allow service role (which bypasses RLS)
-- Since service role bypasses RLS anyway, we can make this stricter for non-service role users
CREATE POLICY "Users can insert own usage"
ON public.account_intelligence_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);