-- Add linked_expense_id to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS linked_expense_id UUID REFERENCES expenses(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'; -- Ensure status column exists and has default

-- Update RLS to allow reading/updating this new column (already covered by existing policies usually, but good to check)
-- Existing policies cover "ALL" or "SELECT/UPDATE" on the table, so adding a column usually inherits permissions if not explicitly restricted by column-level security (which is rare in standard RLS setups).
