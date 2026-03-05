-- Add expense tracking columns to payroll tables
BEGIN;

-- Add expense_id to rh_closed_payroll_items to track individual salary expenses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'expense_id') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add tax_expense_ids and integrated_expense_ids to rh_closed_payrolls to track consolidated tax expenses and all integrated expenses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payrolls' AND column_name = 'tax_expense_ids') THEN
        ALTER TABLE public.rh_closed_payrolls ADD COLUMN tax_expense_ids JSONB DEFAULT '[]'::JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payrolls' AND column_name = 'integrated_expense_ids') THEN
        ALTER TABLE public.rh_closed_payrolls ADD COLUMN integrated_expense_ids JSONB DEFAULT '[]'::JSONB;
    END IF;
END $$;

COMMIT;
