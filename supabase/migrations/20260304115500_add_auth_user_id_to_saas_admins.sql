-- Add auth_user_id to saas_admins table
ALTER TABLE public.saas_admins ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
