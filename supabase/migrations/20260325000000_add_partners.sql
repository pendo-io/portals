-- Migration: Add partners table and link users to partners

-- 1. Create partner_type enum
DO $$ BEGIN
  CREATE TYPE public.partner_type AS ENUM ('partner', 'oem', 'japan');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type partner_type NOT NULL DEFAULT 'partner',
  sfdc_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their own partner (via profiles FK)
CREATE POLICY "Users can view own partner"
ON public.partners
FOR SELECT
TO authenticated
USING (
  id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid())
);

-- Super admins can view all partners
CREATE POLICY "Super admins can view all partners"
ON public.partners
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can manage partners
CREATE POLICY "Super admins can manage partners"
ON public.partners
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Add partner_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id);

-- 4. Add updated_at trigger for partners
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
