-- Add calculation_type column to rh_event_types
ALTER TABLE public.rh_event_types 
ADD COLUMN IF NOT EXISTS calculation_type TEXT DEFAULT 'FIXED' CHECK (calculation_type IN ('FIXED', 'PERCENTAGE'));
