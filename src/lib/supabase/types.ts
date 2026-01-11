/**
 * Supabase database type definitions
 * Auto-generated types should replace this file when using supabase gen types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'player' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'player' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'player' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          age: number;
          main_position: 'GK' | 'DF' | 'MID' | 'ST';
          alt_position: 'GK' | 'DF' | 'MID' | 'ST' | null;
          contact_email: string | null;
          contact_phone: string | null;
          contact_opt_in: boolean;
          profile_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          age: number;
          main_position: 'GK' | 'DF' | 'MID' | 'ST';
          alt_position?: 'GK' | 'DF' | 'MID' | 'ST' | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_opt_in?: boolean;
          profile_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          age?: number;
          main_position?: 'GK' | 'DF' | 'MID' | 'ST';
          alt_position?: 'GK' | 'DF' | 'MID' | 'ST' | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_opt_in?: boolean;
          profile_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_admin_ratings: {
        Row: {
          id: string;
          player_id: string;
          rating_stars: number;
          rated_by_admin_id: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          rating_stars: number;
          rated_by_admin_id: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          rating_stars?: number;
          rated_by_admin_id?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checkins: {
        Row: {
          id: string;
          player_id: string;
          date: string;
          status: 'checked_in' | 'checked_out';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          date: string;
          status?: 'checked_in' | 'checked_out';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          date?: string;
          status?: 'checked_in' | 'checked_out';
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          scope_type: 'global' | 'date_specific';
          scope_date: string | null;
          urgency: 'info' | 'important';
          visible_from: string;
          visible_until: string | null;
          created_by: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          scope_type?: 'global' | 'date_specific';
          scope_date?: string | null;
          urgency?: 'info' | 'important';
          visible_from?: string;
          visible_until?: string | null;
          created_by: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          scope_type?: 'global' | 'date_specific';
          scope_date?: string | null;
          urgency?: 'info' | 'important';
          visible_from?: string;
          visible_until?: string | null;
          created_by?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_runs: {
        Row: {
          id: string;
          date: string;
          algorithm_version: string;
          status: 'draft' | 'published' | 'locked';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          algorithm_version?: string;
          status?: 'draft' | 'published' | 'locked';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          algorithm_version?: string;
          status?: 'draft' | 'published' | 'locked';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_assignments: {
        Row: {
          id: string;
          team_run_id: string;
          player_id: string;
          team_color: 'red' | 'blue' | 'yellow' | 'sub';
          assigned_role: 'GK' | 'DF' | 'MID' | 'ST' | null;
          assignment_reason: string | null;
          is_manual_override: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_run_id: string;
          player_id: string;
          team_color: 'red' | 'blue' | 'yellow' | 'sub';
          assigned_role?: 'GK' | 'DF' | 'MID' | 'ST' | null;
          assignment_reason?: string | null;
          is_manual_override?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_run_id?: string;
          player_id?: string;
          team_color?: 'red' | 'blue' | 'yellow' | 'sub';
          assigned_role?: 'GK' | 'DF' | 'MID' | 'ST' | null;
          assignment_reason?: string | null;
          is_manual_override?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'player' | 'admin';
      position_type: 'GK' | 'DF' | 'MID' | 'ST';
      checkin_status: 'checked_in' | 'checked_out';
      announcement_scope: 'global' | 'date_specific';
      announcement_urgency: 'info' | 'important';
      team_run_status: 'draft' | 'published' | 'locked';
      team_color: 'red' | 'blue' | 'yellow' | 'sub';
    };
  };
}
