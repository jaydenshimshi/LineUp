'use client';

/**
 * Real-time check-in counts hook
 * Subscribes to check-in changes and updates counts for multiple dates
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeCheckinCountsOptions {
  organizationId: string;
  dates: string[];
  initialCounts: Record<string, number>;
}

export function useRealtimeCheckinCounts({
  organizationId,
  dates,
  initialCounts,
}: UseRealtimeCheckinCountsOptions) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);

  // Fetch counts for all dates
  const fetchCounts = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('checkins')
      .select('date')
      .eq('organization_id', organizationId)
      .eq('status', 'checked_in')
      .in('date', dates);

    if (!error && data) {
      const newCounts: Record<string, number> = {};
      dates.forEach((d) => (newCounts[d] = 0));
      data.forEach((c: { date: string }) => {
        newCounts[c.date] = (newCounts[c.date] || 0) + 1;
      });
      setCounts(newCounts);
    }
  }, [organizationId, dates]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    // Subscribe to checkin changes for this organization
    channel = supabase
      .channel(`checkins-org-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newRecord = payload.new as { date?: string; status?: string };
          const oldRecord = payload.old as { date?: string; status?: string };

          // Check if change affects our dates
          const affectedDate = newRecord?.date || oldRecord?.date;
          if (affectedDate && dates.includes(affectedDate)) {
            fetchCounts();
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [organizationId, dates, fetchCounts]);

  return { counts, refetch: fetchCounts };
}
