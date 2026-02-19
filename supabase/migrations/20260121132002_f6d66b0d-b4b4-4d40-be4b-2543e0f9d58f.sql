-- Fix 1: Add restrictive SELECT policy for profiles to prevent data enumeration
-- Users can only view their own profile OR super admins can view all
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- Fix 2: Add INSERT policy for profiles (handled by trigger, but explicit is better)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix 3: Enable RLS on workflows_public view - but views inherit from base table
-- The workflows table should have proper policies. Let's check and add if needed.
-- workflows_public is a VIEW with security_invoker=true, so it uses caller's permissions on workflows table

-- Fix 4: Add DELETE policy for workflow_runs
DROP POLICY IF EXISTS "Users can delete own workflow runs" ON public.workflow_runs;
CREATE POLICY "Users can delete own workflow runs" ON public.workflow_runs
  FOR DELETE USING (auth.uid() = user_id);

-- Fix 5: Add UPDATE and DELETE policies for ask_will_messages
DROP POLICY IF EXISTS "Users can update own messages" ON public.ask_will_messages;
CREATE POLICY "Users can update own messages" ON public.ask_will_messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.ask_will_messages;
CREATE POLICY "Users can delete own messages" ON public.ask_will_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Fix 6: Add UPDATE and DELETE policies for ask_will_reasoning_messages
DROP POLICY IF EXISTS "Users can update own reasoning messages" ON public.ask_will_reasoning_messages;
CREATE POLICY "Users can update own reasoning messages" ON public.ask_will_reasoning_messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reasoning messages" ON public.ask_will_reasoning_messages;
CREATE POLICY "Users can delete own reasoning messages" ON public.ask_will_reasoning_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Fix 7: Ensure account_intelligence_reports has proper restrictive policies
-- Users should only see their own reports OR super admins can see all
DROP POLICY IF EXISTS "Users can view own reports" ON public.account_intelligence_reports;
CREATE POLICY "Users can view own reports" ON public.account_intelligence_reports
  FOR SELECT USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'super_admin')
  );