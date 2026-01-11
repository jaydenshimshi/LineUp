/**
 * Organization/Group types for multi-tenant architecture
 */

export type OrgRole = 'member' | 'admin' | 'owner';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sport: string;
  logo_url: string | null;
  join_code: string | null;
  is_public: boolean;
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrgRole;
  player_id: string | null;
  joined_at: string;
  invited_by: string | null;
}

export interface MembershipWithOrg extends Membership {
  organizations: Organization;
}

export interface MembershipWithUser extends Membership {
  users: {
    id: string;
    email: string;
  };
  players: {
    id: string;
    full_name: string;
    profile_completed: boolean;
  } | null;
}

export interface CreateOrgData {
  name: string;
  slug: string;
  description?: string;
  sport?: string;
}

export interface JoinOrgData {
  code: string;
}
