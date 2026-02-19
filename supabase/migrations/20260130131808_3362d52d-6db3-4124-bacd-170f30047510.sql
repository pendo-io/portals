-- Add is_favorite column to track favorited reports
ALTER TABLE account_intelligence_reports 
ADD COLUMN is_favorite boolean DEFAULT false;