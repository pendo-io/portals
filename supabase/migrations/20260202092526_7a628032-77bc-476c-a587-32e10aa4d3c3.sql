-- Update the check constraint for report_type to include 'snapshot'
ALTER TABLE public.account_intelligence_reports 
DROP CONSTRAINT IF EXISTS account_intelligence_reports_report_type_check;

ALTER TABLE public.account_intelligence_reports
ADD CONSTRAINT account_intelligence_reports_report_type_check 
CHECK (report_type IN ('overview', 'strategic', 'value', 'strategy', 'value_hypothesis', 'strategy_map', 'outreach', 'snapshot'));