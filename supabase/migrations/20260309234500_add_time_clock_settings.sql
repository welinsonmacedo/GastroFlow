ALTER TABLE public.rh_payroll_settings ADD COLUMN IF NOT EXISTS time_clock JSONB DEFAULT '{"validationType": "NONE", "maxDailyPunches": 4}';
