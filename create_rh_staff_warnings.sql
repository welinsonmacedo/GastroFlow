-- Create Staff Warnings table
CREATE TABLE IF NOT EXISTS public.rh_staff_warnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('VERBAL', 'FORMAL')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.rh_staff_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.rh_staff_warnings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.rh_staff_warnings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on tenant" ON public.rh_staff_warnings
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for users based on tenant" ON public.rh_staff_warnings
    FOR DELETE USING (auth.role() = 'authenticated');
