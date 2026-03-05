-- Trigger to automatically create a client profile when a new user signs up
-- This avoids RLS issues where the user is not yet logged in during sign up

CREATE OR REPLACE FUNCTION public.handle_new_client_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create a client profile if the user metadata contains 'cpf'
    -- This distinguishes client signups from other types of users (like staff/admins)
    IF (NEW.raw_user_meta_data->>'cpf') IS NOT NULL THEN
        INSERT INTO public.clients (auth_user_id, name, phone, cpf)
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'cpf'
        )
        ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;
CREATE TRIGGER on_auth_user_created_client
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_user();
