/**
 * Core type definitions for the Soccer Team Check-in app
 */

export type UserRole = 'player' | 'admin';

export type PositionType = 'GK' | 'DF' | 'MID' | 'ST';

export type CheckinStatus = 'checked_in' | 'checked_out';

export type AnnouncementScope = 'global' | 'date_specific';

export type AnnouncementUrgency = 'info' | 'important';

export type TeamRunStatus = 'draft' | 'published' | 'locked';

export type TeamColor = 'red' | 'blue' | 'yellow' | 'sub';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  main_position: PositionType;
  alt_position: PositionType | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_opt_in: boolean;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerAdminRating {
  id: string;
  player_id: string;
  rating_stars: number;
  rated_by_admin_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Checkin {
  id: string;
  player_id: string;
  date: string;
  status: CheckinStatus;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  scope_type: AnnouncementScope;
  scope_date: string | null;
  urgency: AnnouncementUrgency;
  visible_from: string;
  visible_until: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamRun {
  id: string;
  date: string;
  algorithm_version: string;
  status: TeamRunStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamAssignment {
  id: string;
  team_run_id: string;
  player_id: string;
  team_color: TeamColor;
  assigned_role: PositionType | null;
  assignment_reason: string | null;
  is_manual_override: boolean;
  created_at: string;
}

export interface PlayerWithRating extends Player {
  rating?: PlayerAdminRating;
}

export interface PlayerWithCheckin extends Player {
  checkin?: Checkin;
}
