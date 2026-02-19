-- Add is_beta column to workflows table
ALTER TABLE public.workflows ADD COLUMN is_beta boolean NOT NULL DEFAULT false;