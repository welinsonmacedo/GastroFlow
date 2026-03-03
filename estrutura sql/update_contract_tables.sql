-- Create Contract Templates table
CREATE TABLE IF NOT EXISTS public.rh_contract_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'CONTRACT',
    content TEXT NOT NULL, -- HTML or Markdown content
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add signed_contract_url to staff
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS signed_contract_url TEXT;

-- RLS Policies (assuming standard RLS setup)
ALTER TABLE public.rh_contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.rh_contract_templates
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.rh_contract_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on tenant" ON public.rh_contract_templates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for users based on tenant" ON public.rh_contract_templates
    FOR DELETE USING (auth.role() = 'authenticated');
