-- Cleanup orphaned players (players whose user_id has no membership in the same org)
-- Run this in Supabase SQL Editor

-- First, delete team assignments for orphaned players
DELETE FROM team_assignments
WHERE player_id IN (
  SELECT p.id FROM players p
  WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = p.user_id
    AND m.organization_id = p.organization_id
  )
);

-- Delete ratings for orphaned players
DELETE FROM player_admin_ratings
WHERE player_id IN (
  SELECT p.id FROM players p
  WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = p.user_id
    AND m.organization_id = p.organization_id
  )
);

-- Delete check-ins for orphaned players
DELETE FROM checkins
WHERE player_id IN (
  SELECT p.id FROM players p
  WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = p.user_id
    AND m.organization_id = p.organization_id
  )
);

-- Finally, delete the orphaned players
DELETE FROM players
WHERE user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM memberships m
  WHERE m.user_id = players.user_id
  AND m.organization_id = players.organization_id
);
