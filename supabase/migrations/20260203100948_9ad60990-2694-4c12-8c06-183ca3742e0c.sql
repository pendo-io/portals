-- Create API audit log table for security monitoring
CREATE TABLE public.api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_name TEXT NOT NULL,
  action TEXT NOT NULL,
  request_params JSONB DEFAULT '{}',
  response_status INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups by user and time
CREATE INDEX idx_api_audit_log_user_id ON public.api_audit_log(user_id);
CREATE INDEX idx_api_audit_log_created_at ON public.api_audit_log(created_at DESC);
CREATE INDEX idx_api_audit_log_api_name ON public.api_audit_log(api_name);

-- Enable RLS
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON public.api_audit_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Edge functions can insert audit logs (service role)
CREATE POLICY "Service role can insert audit logs"
  ON public.api_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  _user_id UUID,
  _api_name TEXT,
  _max_calls INTEGER DEFAULT 20,
  _window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  call_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO call_count
  FROM public.api_audit_log
  WHERE user_id = _user_id
    AND api_name = _api_name
    AND created_at > (now() - (_window_minutes || ' minutes')::INTERVAL);
  
  RETURN call_count < _max_calls;
END;
$$;