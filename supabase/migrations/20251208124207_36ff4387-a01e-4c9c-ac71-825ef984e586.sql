-- Add policy for authenticated users to view active workflows (without webhook URL, they use the edge function)
CREATE POLICY "Authenticated users can view active workflows without webhook" 
ON public.workflows 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);