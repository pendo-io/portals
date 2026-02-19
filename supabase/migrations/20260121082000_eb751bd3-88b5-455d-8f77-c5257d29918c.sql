-- Add public_slug column to workflows table for shareable links
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

-- Set the public slug for CX Leader Alignment Brief
UPDATE public.workflows 
SET public_slug = 'cx-leader-alignment-brief' 
WHERE id = '1379c9ca-6444-4408-964e-1287aa1f55cf';