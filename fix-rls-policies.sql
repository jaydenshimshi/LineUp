-- Fix RLS Policies for Organizations
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'organizations';

-- Drop existing organization policies
DROP POLICY IF EXISTS "Anyone can view public orgs" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can create org" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update org" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete org" ON public.organizations;

-- Recreate with simpler, working policies

-- SELECT: Users can see public orgs OR orgs they're members of
CREATE POLICY "View organizations" ON public.organizations
    FOR SELECT USING (
        is_public = TRUE
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = organizations.id
            AND memberships.user_id = auth.uid()
        )
    );

-- INSERT: Any authenticated user can create an org (they become owner)
CREATE POLICY "Create organizations" ON public.organizations
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- UPDATE: Only admins/owners can update
CREATE POLICY "Update organizations" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = organizations.id
            AND memberships.user_id = auth.uid()
            AND memberships.role IN ('admin', 'owner')
        )
    );

-- DELETE: Only owners can delete
CREATE POLICY "Delete organizations" ON public.organizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = organizations.id
            AND memberships.user_id = auth.uid()
            AND memberships.role = 'owner'
        )
    );

-- Also fix memberships policies
DROP POLICY IF EXISTS "Members can view org memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can leave orgs" ON public.memberships;

-- SELECT: Users can see their own memberships and memberships of orgs they belong to
CREATE POLICY "View memberships" ON public.memberships
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships m2
            WHERE m2.organization_id = memberships.organization_id
            AND m2.user_id = auth.uid()
        )
    );

-- INSERT: Allow users to create memberships (for joining orgs or being added)
CREATE POLICY "Create memberships" ON public.memberships
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- UPDATE: Admins can update memberships
CREATE POLICY "Update memberships" ON public.memberships
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.memberships m2
            WHERE m2.organization_id = memberships.organization_id
            AND m2.user_id = auth.uid()
            AND m2.role IN ('admin', 'owner')
        )
    );

-- DELETE: Users can leave (delete own) or admins can remove
CREATE POLICY "Delete memberships" ON public.memberships
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships m2
            WHERE m2.organization_id = memberships.organization_id
            AND m2.user_id = auth.uid()
            AND m2.role IN ('admin', 'owner')
        )
    );

-- Verify policies
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('organizations', 'memberships')
ORDER BY tablename, policyname;
