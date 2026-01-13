/**
 * Session Date Utility
 *
 * Determines which game session a check-in should be recorded for.
 *
 * CUTOFF LOGIC:
 * - Before 7:00 AM local time: Check-ins are for TODAY's session
 * - At or after 7:00 AM local time: Check-ins are for TOMORROW's session
 *
 * RATIONALE:
 * Games start early in the morning. After the cutoff time,
 * any check-ins should be for the next day's game.
 *
 * To adjust the cutoff time, change SESSION_CUTOFF_HOUR below.
 * To adjust the timezone, set SESSION_TIMEZONE environment variable.
 */

import { format } from 'date-fns';

/**
 * The hour (in 24-hour format) after which check-ins roll to the next day.
 * Default: 7 (7:00 AM) - Games start early morning
 *
 * Examples:
 * - 6 = 6:00 AM
 * - 10 = 10:00 AM
 * - 12 = 12:00 PM (noon)
 */
export const SESSION_CUTOFF_HOUR = 7;

/**
 * The timezone to use for session date calculations.
 * Set via SESSION_TIMEZONE environment variable.
 * Default: 'America/Chicago' (CST/CDT)
 */
export const SESSION_TIMEZONE = process.env.SESSION_TIMEZONE || 'America/Chicago';

/**
 * Gets the current hour in the configured timezone.
 * This ensures consistent behavior regardless of server timezone.
 */
function getLocalHour(date: Date): number {
  // Use Intl.DateTimeFormat to get the hour in the configured timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: SESSION_TIMEZONE,
  });
  const hourStr = formatter.format(date);
  // Handle "24" which some locales return for midnight
  const hour = parseInt(hourStr, 10);
  return hour === 24 ? 0 : hour;
}

/**
 * Gets the local date string in the configured timezone.
 * This ensures we get the correct date even when server is in different timezone.
 */
function getLocalDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SESSION_TIMEZONE,
  });
  return formatter.format(date); // Returns yyyy-MM-dd format
}

/**
 * Determines the session date based on the current time in the configured timezone.
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
  // Get the current hour in the configured timezone
  const currentHour = getLocalHour(now);
  const isAfterCutoff = currentHour >= SESSION_CUTOFF_HOUR;

  // Get today's date in the local timezone
  const todayString = getLocalDateString(now);

  // If after cutoff, session is for tomorrow
  let sessionDateString: string;
  if (isAfterCutoff) {
    // Add one day to today's date
    const [year, month, day] = todayString.split('-').map(Number);
    const tomorrow = new Date(year, month - 1, day + 1);
    sessionDateString = format(tomorrow, 'yyyy-MM-dd');
  } else {
    sessionDateString = todayString;
  }

  // Create the session date object for display formatting
  const [year, month, day] = sessionDateString.split('-').map(Number);
  const sessionDate = new Date(year, month - 1, day);

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
