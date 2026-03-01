-- Add type column to rh_contract_templates
ALTER TABLE public.rh_contract_templates 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'CONTRACT';

-- Update existing records to have a default type if they don't
UPDATE public.rh_contract_templates SET type = 'CONTRACT' WHERE type IS NULL;
