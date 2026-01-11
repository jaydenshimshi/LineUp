-- Add bench_team column to team_assignments table
-- Run this in Supabase SQL Editor

-- Add the bench_team column (nullable, only used for subs)
ALTER TABLE public.team_assignments
ADD COLUMN bench_team team_color;

COMMENT ON COLUMN public.team_assignments.bench_team IS 'For subs only: which team bench they are assigned to (red, blue, or yellow)';
