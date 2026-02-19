-- Drop the existing check constraint
ALTER TABLE public.account_intelligence_reports 
DROP CONSTRAINT IF EXISTS account_intelligence_reports_report_type_check;

-- Add updated check constraint that includes strategy_map
ALTER TABLE public.account_intelligence_reports 
ADD CONSTRAINT account_intelligence_reports_report_type_check 
CHECK (report_type IN ('overview', 'strategic', 'value', 'strategy', 'value_hypothesis', 'strategy_map'));