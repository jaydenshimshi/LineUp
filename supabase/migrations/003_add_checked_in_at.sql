-- ============================================
-- MIGRATION: Add checked_in_at column to checkins table
-- ============================================
-- This column tracks the exact timestamp when a player checked in,
-- separate from created_at which doesn't update on re-check-in.
-- This enables first-come-first-serve sub determination in team generation.

-- Add checked_in_at column to checkins table
ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NOW();

-- Add organization_id column if it doesn't exist (for proper org scoping)
ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill checked_in_at with created_at for existing records
UPDATE public.checkins
SET checked_in_at = created_at
WHERE checked_in_at IS NULL;

-- Make checked_in_at not null after backfill
ALTER TABLE public.checkins
ALTER COLUMN checked_in_at SET NOT NULL;

-- Add index for efficient ordering by check-in time
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON public.checkins(checked_in_at);

-- Add index for organization_id queries
CREATE INDEX IF NOT EXISTS idx_checkins_organization_id ON public.checkins(organization_id);

COMMENT ON COLUMN public.checkins.checked_in_at IS 'Timestamp when player checked in (updates on re-check-in for first-come-first-serve ordering)';
