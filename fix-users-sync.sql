-- Fix: Sync auth.users to public.users
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. First, sync any existing auth.users that don't have public.users records
INSERT INTO public.users (id, email, role)
SELECT id, email, 'player'::user_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure the trigger exists for future signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'player')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Verify: Show synced users
SELECT id, email, role, created_at FROM public.users ORDER BY created_at DESC LIMIT 10;
