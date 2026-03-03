ALTER TABLE public.rh_staff_warnings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
