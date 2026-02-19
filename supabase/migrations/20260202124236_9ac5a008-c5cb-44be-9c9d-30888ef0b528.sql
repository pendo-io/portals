-- Create report types configuration table
CREATE TABLE public.report_type_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type text NOT NULL UNIQUE,
    display_name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    is_beta boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    icon_name text DEFAULT 'FileText',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_type_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active report types
CREATE POLICY "Authenticated users can view active report types"
ON public.report_type_config
FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'super_admin'));

-- Only super admins can insert
CREATE POLICY "Super admins can insert report types"
ON public.report_type_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Only super admins can update
CREATE POLICY "Super admins can update report types"
ON public.report_type_config
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Only super admins can delete
CREATE POLICY "Super admins can delete report types"
ON public.report_type_config
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_report_type_config_updated_at
BEFORE UPDATE ON public.report_type_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default report types
INSERT INTO public.report_type_config (report_type, display_name, description, is_active, is_beta, sort_order, icon_name) VALUES
('snapshot', 'Account Snapshot', 'Quick 20-second research brief with company basics, news, hiring trends, and AI podcast', true, false, 1, 'Zap'),
('overview', 'Account Overview', 'Comprehensive 10-section executive brief with deep strategic analysis', true, false, 2, 'FileText'),
('strategic', 'Strategic Analysis', 'In-depth competitive positioning and market opportunity analysis', true, true, 3, 'Target'),
('value', 'Value Hypothesis', 'Pendo-specific value proposition tailored to the account', true, false, 4, 'Lightbulb'),
('strategy', 'Strategy Map', 'Visual strategic roadmap with stakeholder mapping', true, false, 5, 'Map'),
('outreach', 'Outreach Report', 'Persona-based email and messaging content for sales outreach', true, false, 6, 'Mail');