/**
 * Session Date Utility
 *
 * Determines which game session a check-in should be recorded for.
 *
 * CUTOFF LOGIC:
 * - Before 6:00 AM local time: Check-ins are for TODAY's session
 * - At or after 6:00 AM local time: Check-ins are for TOMORROW's session
 *
 * RATIONALE:
 * Games start early in the morning. After the cutoff time,
 * any check-ins should be for the next day's game.
 *
 * To adjust the cutoff time, change SESSION_CUTOFF_HOUR below.
 */

import { format, addDays } from 'date-fns';

/**
 * The hour (in 24-hour format) after which check-ins roll to the next day.
 * Default: 6 (6:00 AM) - Games start early morning
 *
 * Examples:
 * - 6 = 6:00 AM
 * - 10 = 10:00 AM
 * - 12 = 12:00 PM (noon)
 */
export const SESSION_CUTOFF_HOUR = 6;

/**
 * Determines the session date based on the current time.
 *
 * @param now - The current date/time (defaults to new Date())
 * @returns Object containing:
 *   - sessionDate: The Date object for the session
 *   - sessionDateString: The date string in 'yyyy-MM-dd' format
 *   - isNextDay: Whether this is for tomorrow's session
 *   - displayLabel: Human-readable label for the session
 */
export function getSessionDate(now: Date = new Date()): {
  sessionDate: Date;
  sessionDateString: string;
  isNextDay: boolean;
  displayLabel: string;
} {
  const currentHour = now.getHours();
  const isAfterCutoff = currentHour >= SESSION_CUTOFF_HOUR;

  // If after cutoff, session is for tomorrow
  const sessionDate = isAfterCutoff ? addDays(now, 1) : now;
  const sessionDateString = format(sessionDate, 'yyyy-MM-dd');

  // Create a human-readable label
  const displayLabel = isAfterCutoff
    ? `Tomorrow (${format(sessionDate, 'EEE, MMM d')})`
    : `Today (${format(sessionDate, 'EEE, MMM d')})`;

  return {
    sessionDate,
    sessionDateString,
    isNextDay: isAfterCutoff,
    displayLabel,
  };
}

/**
 * Gets just the session date string (convenience function).
 *
 * @param now - The current date/time (defaults to new Date())
 * @returns The session date string in 'yyyy-MM-dd' format
 */
export function getSessionDateString(now: Date = new Date()): string {
  return getSessionDate(now).sessionDateString;
}

/**
 * Formats the session date for display in UI headers.
 *
 * @param sessionDate - The session Date object
 * @param isNextDay - Whether this is for tomorrow's session
 * @returns Formatted string like "Today, Mon Jan 13" or "Tomorrow, Tue Jan 14"
 */
export function formatSessionHeader(sessionDate: Date, isNextDay: boolean): string {
  const dayLabel = isNextDay ? 'Tomorrow' : 'Today';
  return `${dayLabel}, ${format(sessionDate, 'EEE MMM d')}`;
}
