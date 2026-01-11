'use client';

/**
 * Announcement banner component - displays active announcements prominently
 */

import { X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/types';

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.has(a.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  function formatTime(dateString: string | null) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-2">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            'relative rounded-lg p-4 pr-10',
            announcement.urgency === 'important'
              ? 'bg-red-50 border-2 border-red-200 text-red-900'
              : 'bg-blue-50 border border-blue-200 text-blue-900'
          )}
        >
          <button
            onClick={() => handleDismiss(announcement.id)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-2">
            {announcement.urgency === 'important' && (
              <span className="font-bold text-red-600 uppercase text-sm">
                Important:
              </span>
            )}
            <div className="flex-1">
              <p className="font-semibold">{announcement.title}</p>
              <p className="text-sm mt-1">{announcement.body}</p>
              {announcement.visible_until && (
                <p className="text-xs mt-2 opacity-70">
                  Visible until {formatTime(announcement.visible_until)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
