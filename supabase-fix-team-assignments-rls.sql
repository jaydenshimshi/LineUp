-- Fix team_assignments RLS policy for multi-tenancy
-- Run this in Supabase SQL Editor
-- This fixes the issue where published teams don't show for org members

-- Drop old policies that don't support multi-tenancy properly
DROP POLICY IF EXISTS "Players can view published assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.team_assignments;

-- Create org-aware policy for viewing published team assignments
-- Members can only see assignments for team runs in their organizations
CREATE POLICY "Members can view published assignments" ON public.team_assignments
    FOR SELECT USING (
        team_run_id IN (
            SELECT id FROM public.team_runs
            WHERE is_org_member(organization_id) AND status IN ('published', 'locked')
        )
    );

-- Create org-aware policy for managing team assignments (admin only)
CREATE POLICY "Org admins can manage assignments" ON public.team_assignments
    FOR ALL USING (
        team_run_id IN (
            SELECT id FROM public.team_runs
            WHERE is_org_admin(organization_id)
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'team_assignments';
