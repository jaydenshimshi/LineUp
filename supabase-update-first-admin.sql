-- Update the handle_new_user function to make the first user an admin
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
    user_role user_role;
BEGIN
    -- Count existing admins
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'admin';

    -- First user becomes admin, others are players
    IF admin_count = 0 THEN
        user_role := 'admin';
    ELSE
        user_role := 'player';
    END IF;

    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, user_role);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
