CREATE TABLE IF NOT EXISTS public.table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own sessions (authenticated or anonymous)
CREATE POLICY "Users can insert their own sessions" ON public.table_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own sessions
CREATE POLICY "Users can read their own sessions" ON public.table_sessions
    FOR SELECT USING (auth.uid() = user_id);
