-- Soccer Team Check-in & Balanced Matchmaking
-- Row Level Security (RLS) Policies
-- Version: 1.0.0

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_admin_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's player ID
CREATE OR REPLACE FUNCTION get_player_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.players
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own data
CREATE POLICY "users_select_own"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "users_update_own"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "users_select_admin"
    ON public.users
    FOR SELECT
    USING (is_admin());

-- ============================================
-- PLAYERS TABLE POLICIES
-- ============================================

-- Players can view their own profile
CREATE POLICY "players_select_own"
    ON public.players
    FOR SELECT
    USING (user_id = auth.uid());

-- Players can insert their own profile
CREATE POLICY "players_insert_own"
    ON public.players
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Players can update their own profile
CREATE POLICY "players_update_own"
    ON public.players
    FOR UPDATE
    USING (user_id = auth.uid());

-- Admins can view all players
CREATE POLICY "players_select_admin"
    ON public.players
    FOR SELECT
    USING (is_admin());

-- Admins can manage all players
CREATE POLICY "players_all_admin"
    ON public.players
    FOR ALL
    USING (is_admin());

-- ============================================
-- PLAYER ADMIN RATINGS POLICIES
-- CRITICAL: These ratings must NEVER be visible to players
-- ============================================

-- Only admins can view ratings
CREATE POLICY "ratings_select_admin_only"
    ON public.player_admin_ratings
    FOR SELECT
    USING (is_admin());

-- Only admins can insert ratings
CREATE POLICY "ratings_insert_admin_only"
    ON public.player_admin_ratings
    FOR INSERT
    WITH CHECK (is_admin());

-- Only admins can update ratings
CREATE POLICY "ratings_update_admin_only"
    ON public.player_admin_ratings
    FOR UPDATE
    USING (is_admin());

-- Only admins can delete ratings
CREATE POLICY "ratings_delete_admin_only"
    ON public.player_admin_ratings
    FOR DELETE
    USING (is_admin());

-- ============================================
-- CHECKINS TABLE POLICIES
-- ============================================

-- Players can view their own checkins
CREATE POLICY "checkins_select_own"
    ON public.checkins
    FOR SELECT
    USING (player_id = get_player_id());

-- Players can insert their own checkins
CREATE POLICY "checkins_insert_own"
    ON public.checkins
    FOR INSERT
    WITH CHECK (player_id = get_player_id());

-- Players can update their own checkins
CREATE POLICY "checkins_update_own"
    ON public.checkins
    FOR UPDATE
    USING (player_id = get_player_id());

-- Players can delete their own checkins
CREATE POLICY "checkins_delete_own"
    ON public.checkins
    FOR DELETE
    USING (player_id = get_player_id());

-- Admins can view all checkins
CREATE POLICY "checkins_select_admin"
    ON public.checkins
    FOR SELECT
    USING (is_admin());

-- Admins can manage all checkins
CREATE POLICY "checkins_all_admin"
    ON public.checkins
    FOR ALL
    USING (is_admin());

-- ============================================
-- ANNOUNCEMENTS TABLE POLICIES
-- ============================================

-- Authenticated users can view active announcements
CREATE POLICY "announcements_select_active"
    ON public.announcements
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_active = TRUE
        AND visible_from <= NOW()
        AND (visible_until IS NULL OR visible_until >= NOW())
    );

-- Admins can view all announcements (including inactive)
CREATE POLICY "announcements_select_admin"
    ON public.announcements
    FOR SELECT
    USING (is_admin());

-- Admins can insert announcements
CREATE POLICY "announcements_insert_admin"
    ON public.announcements
    FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update announcements
CREATE POLICY "announcements_update_admin"
    ON public.announcements
    FOR UPDATE
    USING (is_admin());

-- Admins can delete announcements
CREATE POLICY "announcements_delete_admin"
    ON public.announcements
    FOR DELETE
    USING (is_admin());

-- ============================================
-- TEAM RUNS TABLE POLICIES
-- ============================================

-- Authenticated users can view published/locked team runs
CREATE POLICY "team_runs_select_published"
    ON public.team_runs
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND status IN ('published', 'locked')
    );

-- Admins can view all team runs
CREATE POLICY "team_runs_select_admin"
    ON public.team_runs
    FOR SELECT
    USING (is_admin());

-- Admins can insert team runs
CREATE POLICY "team_runs_insert_admin"
    ON public.team_runs
    FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update team runs
CREATE POLICY "team_runs_update_admin"
    ON public.team_runs
    FOR UPDATE
    USING (is_admin());

-- Admins can delete team runs
CREATE POLICY "team_runs_delete_admin"
    ON public.team_runs
    FOR DELETE
    USING (is_admin());

-- ============================================
-- TEAM ASSIGNMENTS TABLE POLICIES
-- ============================================

-- Authenticated users can view assignments for published team runs
CREATE POLICY "team_assignments_select_published"
    ON public.team_assignments
    FOR SELECT
    USING (
        team_run_id IN (
            SELECT id FROM public.team_runs
            WHERE status IN ('published', 'locked')
        )
    );

-- Admins can view all assignments
CREATE POLICY "team_assignments_select_admin"
    ON public.team_assignments
    FOR SELECT
    USING (is_admin());

-- Admins can insert assignments
CREATE POLICY "team_assignments_insert_admin"
    ON public.team_assignments
    FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update assignments
CREATE POLICY "team_assignments_update_admin"
    ON public.team_assignments
    FOR UPDATE
    USING (is_admin());

-- Admins can delete assignments
CREATE POLICY "team_assignments_delete_admin"
    ON public.team_assignments
    FOR DELETE
    USING (is_admin());
