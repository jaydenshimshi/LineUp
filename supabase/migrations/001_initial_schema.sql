-- Soccer Team Check-in & Balanced Matchmaking
-- Initial Database Schema Migration
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('player', 'admin');
CREATE TYPE position_type AS ENUM ('GK', 'DF', 'MID', 'ST');
CREATE TYPE checkin_status AS ENUM ('checked_in', 'checked_out');
CREATE TYPE announcement_scope AS ENUM ('global', 'date_specific');
CREATE TYPE announcement_urgency AS ENUM ('info', 'important');
CREATE TYPE team_run_status AS ENUM ('draft', 'published', 'locked');
CREATE TYPE team_color AS ENUM ('red', 'blue', 'yellow', 'sub');

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'player' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.users IS 'Extended user profile linked to Supabase auth';
COMMENT ON COLUMN public.users.role IS 'User role: player or admin';

-- Players table (profile data)
CREATE TABLE public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 5 AND age <= 100),
    main_position position_type NOT NULL,
    alt_position position_type,
    contact_email TEXT,
    contact_phone TEXT,
    contact_opt_in BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.players IS 'Player profile information';
COMMENT ON COLUMN public.players.main_position IS 'Primary playing position: GK, DF, MID, or ST';
COMMENT ON COLUMN public.players.alt_position IS 'Secondary/alternate playing position';
COMMENT ON COLUMN public.players.profile_completed IS 'Whether the player has completed their profile setup';

-- Player admin ratings (admin-only, hidden from players)
CREATE TABLE public.player_admin_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID UNIQUE NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    rating_stars INTEGER NOT NULL CHECK (rating_stars >= 1 AND rating_stars <= 5),
    rated_by_admin_id UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.player_admin_ratings IS 'Admin-only skill ratings (1-5 stars) - NEVER exposed to players';
COMMENT ON COLUMN public.player_admin_ratings.rating_stars IS 'Skill rating from 1 to 5 stars';

-- Check-ins table
CREATE TABLE public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status checkin_status DEFAULT 'checked_in' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(player_id, date)
);

COMMENT ON TABLE public.checkins IS 'Player availability check-ins by date';
COMMENT ON COLUMN public.checkins.date IS 'The date of the check-in (YYYY-MM-DD)';

-- Announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    scope_type announcement_scope DEFAULT 'global' NOT NULL,
    scope_date DATE,
    urgency announcement_urgency DEFAULT 'info' NOT NULL,
    visible_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    visible_until TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.announcements IS 'Admin announcements for players';
COMMENT ON COLUMN public.announcements.scope_type IS 'global: visible everywhere, date_specific: tied to a match day';
COMMENT ON COLUMN public.announcements.urgency IS 'info: normal, important: highlighted';

-- Team runs table (for Phase 3)
CREATE TABLE public.team_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    algorithm_version TEXT DEFAULT 'v1.0',
    status team_run_status DEFAULT 'draft' NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.team_runs IS 'Team generation runs by date';
COMMENT ON COLUMN public.team_runs.status IS 'draft: editable, published: visible to players, locked: finalized';

-- Team assignments table (for Phase 3)
CREATE TABLE public.team_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_run_id UUID NOT NULL REFERENCES public.team_runs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_color team_color NOT NULL,
    assigned_role position_type,
    assignment_reason TEXT,
    is_manual_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(team_run_id, player_id)
);

COMMENT ON TABLE public.team_assignments IS 'Player team assignments for a team run';
COMMENT ON COLUMN public.team_assignments.team_color IS 'Team assignment: red, blue, yellow, or sub';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_players_user_id ON public.players(user_id);
CREATE INDEX idx_checkins_date ON public.checkins(date);
CREATE INDEX idx_checkins_player_date ON public.checkins(player_id, date);
CREATE INDEX idx_announcements_scope ON public.announcements(scope_type, scope_date);
CREATE INDEX idx_announcements_active ON public.announcements(is_active, visible_from, visible_until);
CREATE INDEX idx_team_runs_date ON public.team_runs(date);
CREATE INDEX idx_team_assignments_team_run ON public.team_assignments(team_run_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_admin_ratings_updated_at
    BEFORE UPDATE ON public.player_admin_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkins_updated_at
    BEFORE UPDATE ON public.checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_runs_updated_at
    BEFORE UPDATE ON public.team_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTH TRIGGER
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'player');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create public.users record
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
