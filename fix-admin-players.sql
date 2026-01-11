-- Fix for Admin-Created Players and Ratings
-- Run this in Supabase SQL Editor

-- ============================================
-- 0. Ensure player_admin_ratings table exists
-- ============================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.player_admin_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rating_stars INTEGER NOT NULL CHECK (rating_stars >= 1 AND rating_stars <= 5),
    rated_by_admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.player_admin_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. Allow NULL user_id for admin-created players
-- ============================================

-- First, drop the NOT NULL constraint on user_id in players table
ALTER TABLE public.players ALTER COLUMN user_id DROP NOT NULL;

-- Add a check to ensure profile_completed players have required fields
-- (This is optional but good for data integrity)

-- ============================================
-- 2. Fix Players RLS Policies to allow admin operations
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "View players" ON public.players;
DROP POLICY IF EXISTS "Create players" ON public.players;
DROP POLICY IF EXISTS "Update players" ON public.players;
DROP POLICY IF EXISTS "Delete players" ON public.players;
DROP POLICY IF EXISTS "Users can view own players" ON public.players;
DROP POLICY IF EXISTS "Users can create own players" ON public.players;
DROP POLICY IF EXISTS "Users can update own players" ON public.players;
DROP POLICY IF EXISTS "Admins can view org players" ON public.players;
DROP POLICY IF EXISTS "Admins can manage org players" ON public.players;

-- SELECT: Users can see players in their org
CREATE POLICY "View players" ON public.players
    FOR SELECT USING (
        -- User's own player profile
        user_id = auth.uid()
        -- OR user is member of the org
        OR EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = players.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- INSERT: Users can create their own player OR admins can create for org
CREATE POLICY "Create players" ON public.players
    FOR INSERT WITH CHECK (
        -- User creating their own player
        user_id = auth.uid()
        -- OR admin creating player without user_id
        OR (
            user_id IS NULL
            AND EXISTS (
                SELECT 1 FROM public.memberships
                WHERE memberships.organization_id = players.organization_id
                AND memberships.user_id = auth.uid()
                AND memberships.role IN ('admin', 'owner')
            )
        )
    );

-- UPDATE: Users can update own OR admins can update any in org
CREATE POLICY "Update players" ON public.players
    FOR UPDATE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = players.organization_id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- DELETE: Only admins can delete players without user accounts
CREATE POLICY "Delete players" ON public.players
    FOR DELETE USING (
        user_id IS NULL  -- Only allow deleting admin-created players
        AND EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = players.organization_id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- ============================================
-- 3. Fix Player Admin Ratings RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "View ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Create ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Update ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Delete ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Admins can view org ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Admins can manage org ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Admins can create ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Admins can update ratings" ON public.player_admin_ratings;

-- SELECT: Only admins can view ratings
CREATE POLICY "View ratings" ON public.player_admin_ratings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = player_admin_ratings.organization_id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- INSERT: Admins can create ratings
CREATE POLICY "Create ratings" ON public.player_admin_ratings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = player_admin_ratings.organization_id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- UPDATE: Admins can update ratings
CREATE POLICY "Update ratings" ON public.player_admin_ratings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = player_admin_ratings.organization_id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- DELETE: Admins can delete ratings
CREATE POLICY "Delete ratings" ON public.player_admin_ratings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = player_admin_ratings.organization_id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- ============================================
-- 4. Verify the changes
-- ============================================

-- Check players table structure
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'players' AND column_name = 'user_id';

-- Check policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('players', 'player_admin_ratings')
ORDER BY tablename, policyname;
