'use client';

/**
 * Real-time check-ins hook
 * Subscribes to check-in changes for an organization
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeCheckinsOptions {
  organizationId: string;
  date: string;
  onCheckinChange?: (count: number) => void;
}

export function useRealtimeCheckins({
  organizationId,
  date,
  onCheckinChange,
}: UseRealtimeCheckinsOptions) {
  const [checkinCount, setCheckinCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial count
  const fetchCount = useCallback(async () => {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('date', date)
      .eq('status', 'checked_in');

    if (!error && count !== null) {
      setCheckinCount(count);
      onCheckinChange?.(count);
    }
    setIsLoading(false);
  }, [organizationId, date, onCheckinChange]);

  useEffect(() => {
    fetchCount();

    const supabase = createClient();
    let channel: RealtimeChannel;

    // Subscribe to changes
    channel = supabase
      .channel(`checkins-${organizationId}-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          // Check if this change is for our date
          const newRecord = payload.new as { date?: string; status?: string };
          const oldRecord = payload.old as { date?: string; status?: string };

          if (newRecord?.date === date || oldRecord?.date === date) {
            // Refetch count when there's a change
            fetchCount();
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [organizationId, date, fetchCount]);

  return {
    checkinCount,
    isLoading,
    refetch: fetchCount,
  };
}
