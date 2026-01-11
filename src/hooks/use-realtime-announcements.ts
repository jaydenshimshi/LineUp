'use client';

/**
 * Real-time announcements hook
 * Subscribes to announcement changes for an organization
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Announcement {
  id: string;
  title: string;
  message: string;
  scope_type: 'global' | 'date';
  scope_date: string | null;
  urgency: 'info' | 'important';
  visible_from: string;
  visible_until: string | null;
  created_at: string;
}

interface UseRealtimeAnnouncementsOptions {
  organizationId: string;
  date?: string; // Filter for specific date
  onNewAnnouncement?: (announcement: Announcement) => void;
}

export function useRealtimeAnnouncements({
  organizationId,
  date,
  onNewAnnouncement,
}: UseRealtimeAnnouncementsOptions) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    const supabase = createClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('announcements')
      .select('*')
      .eq('organization_id', organizationId)
      .lte('visible_from', now)
      .or(`visible_until.is.null,visible_until.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Filter by date if provided
    if (date) {
      query = query.or(`scope_type.eq.global,scope_date.eq.${date}`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
    setIsLoading(false);
  }, [organizationId, date]);

  useEffect(() => {
    fetchAnnouncements();

    const supabase = createClient();
    let channel: RealtimeChannel;

    // Subscribe to changes
    channel = supabase
      .channel(`announcements-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          onNewAnnouncement?.(newAnnouncement);
          fetchAnnouncements();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'announcements',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchAnnouncements();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcements',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [organizationId, fetchAnnouncements, onNewAnnouncement]);

  return {
    announcements,
    isLoading,
    refetch: fetchAnnouncements,
  };
}
