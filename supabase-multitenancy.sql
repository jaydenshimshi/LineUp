-- Multi-Tenant Architecture Migration
-- Run this in Supabase SQL Editor
-- This adds support for multiple groups/organizations

-- Organizations/Groups table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly name: "downtown-soccer-club"
    description TEXT,
    sport TEXT DEFAULT 'soccer' NOT NULL,
    logo_url TEXT,
    join_code TEXT UNIQUE, -- Optional code for easy joining
    is_public BOOLEAN DEFAULT FALSE, -- Can be found in directory
    settings JSONB DEFAULT '{}', -- Flexible settings
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Membership table (links users to organizations with roles)
CREATE TYPE org_role AS ENUM ('member', 'admin', 'owner');

CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role org_role DEFAULT 'member' NOT NULL,
    player_id UUID REFERENCES public.players(id), -- Link to player profile for this org
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    invited_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, organization_id)
);

-- Add organization_id to players (player profiles are per-organization)
ALTER TABLE public.players ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.players DROP CONSTRAINT players_user_id_key; -- Remove unique, allow multiple per org
ALTER TABLE public.players ADD CONSTRAINT players_user_org_unique UNIQUE(user_id, organization_id);

-- Add organization_id to other tables
ALTER TABLE public.checkins ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.announcements ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.team_runs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.player_admin_ratings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Indexes
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_join_code ON public.organizations(join_code);
CREATE INDEX idx_players_org ON public.players(organization_id);

-- Updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin/owner of an organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid()
        AND organization_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organization policies
CREATE POLICY "Anyone can view public orgs" ON public.organizations
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Members can view their orgs" ON public.organizations
    FOR SELECT USING (is_org_member(id));

CREATE POLICY "Anyone can create org" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Admins can update org" ON public.organizations
    FOR UPDATE USING (is_org_admin(id));

CREATE POLICY "Owners can delete org" ON public.organizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE user_id = auth.uid()
            AND organization_id = id
            AND role = 'owner'
        )
    );

-- Membership policies
CREATE POLICY "Members can view org memberships" ON public.memberships
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage memberships" ON public.memberships
    FOR ALL USING (is_org_admin(organization_id));

CREATE POLICY "Users can leave orgs" ON public.memberships
    FOR DELETE USING (user_id = auth.uid());

-- Update players policies for multi-tenancy
DROP POLICY IF EXISTS "Players can view own profile" ON public.players;
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;
DROP POLICY IF EXISTS "Players can insert own profile" ON public.players;
DROP POLICY IF EXISTS "Admins can view all players" ON public.players;
DROP POLICY IF EXISTS "Admins can manage all players" ON public.players;

CREATE POLICY "Users can view own profiles" ON public.players
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can view org players" ON public.players
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Users can manage own profiles" ON public.players
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Org admins can manage players" ON public.players
    FOR ALL USING (is_org_admin(organization_id));

-- Update checkins policies
DROP POLICY IF EXISTS "Players can view own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Players can manage own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Admins can view all checkins" ON public.checkins;

CREATE POLICY "Members can view org checkins" ON public.checkins
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Members can manage own checkins" ON public.checkins
    FOR ALL USING (
        is_org_member(organization_id) AND
        player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    );

CREATE POLICY "Org admins can manage all checkins" ON public.checkins
    FOR ALL USING (is_org_admin(organization_id));

-- Update announcements policies
DROP POLICY IF EXISTS "Anyone authenticated can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

CREATE POLICY "Members can view org announcements" ON public.announcements
    FOR SELECT USING (
        is_org_member(organization_id) AND
        is_active = TRUE AND
        visible_from <= NOW() AND
        (visible_until IS NULL OR visible_until >= NOW())
    );

CREATE POLICY "Org admins can manage announcements" ON public.announcements
    FOR ALL USING (is_org_admin(organization_id));

-- Update team_runs policies
DROP POLICY IF EXISTS "Players can view published team runs" ON public.team_runs;
DROP POLICY IF EXISTS "Admins can manage team runs" ON public.team_runs;

CREATE POLICY "Members can view published team runs" ON public.team_runs
    FOR SELECT USING (
        is_org_member(organization_id) AND status IN ('published', 'locked')
    );

CREATE POLICY "Org admins can manage team runs" ON public.team_runs
    FOR ALL USING (is_org_admin(organization_id));

-- Update ratings policies
DROP POLICY IF EXISTS "Only admins can view ratings" ON public.player_admin_ratings;
DROP POLICY IF EXISTS "Only admins can manage ratings" ON public.player_admin_ratings;

CREATE POLICY "Org admins can view ratings" ON public.player_admin_ratings
    FOR SELECT USING (is_org_admin(organization_id));

CREATE POLICY "Org admins can manage ratings" ON public.player_admin_ratings
    FOR ALL USING (is_org_admin(organization_id));

-- Function to create organization and make creator owner
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT,
    org_slug TEXT,
    org_description TEXT DEFAULT NULL,
    org_sport TEXT DEFAULT 'soccer'
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create the organization
    INSERT INTO public.organizations (name, slug, description, sport, created_by)
    VALUES (org_name, org_slug, org_description, org_sport, auth.uid())
    RETURNING id INTO new_org_id;

    -- Add creator as owner
    INSERT INTO public.memberships (user_id, organization_id, role)
    VALUES (auth.uid(), new_org_id, 'owner');

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join organization by code
CREATE OR REPLACE FUNCTION join_organization_by_code(code TEXT)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Find org by join code
    SELECT id INTO org_id FROM public.organizations WHERE join_code = code;

    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Invalid join code';
    END IF;

    -- Check if already member
    IF EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND organization_id = org_id) THEN
        RAISE EXCEPTION 'Already a member';
    END IF;

    -- Add as member
    INSERT INTO public.memberships (user_id, organization_id, role)
    VALUES (auth.uid(), org_id, 'member');

    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate unique join code for org
CREATE OR REPLACE FUNCTION generate_join_code(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
BEGIN
    -- Check if admin
    IF NOT is_org_admin(org_id) THEN
        RAISE EXCEPTION 'Only admins can generate join codes';
    END IF;

    -- Generate 8 character code
    new_code := upper(substr(md5(random()::text), 1, 8));

    -- Update org
    UPDATE public.organizations SET join_code = new_code WHERE id = org_id;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
