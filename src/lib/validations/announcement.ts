/**
 * Announcement validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Announcement scope types
 */
export const ANNOUNCEMENT_SCOPES = ['global', 'date_specific'] as const;

/**
 * Announcement urgency levels
 */
export const ANNOUNCEMENT_URGENCY = ['info', 'important'] as const;

/**
 * Scope labels for display
 */
export const SCOPE_LABELS: Record<
  (typeof ANNOUNCEMENT_SCOPES)[number],
  string
> = {
  global: 'Global (All Dates)',
  date_specific: 'Specific Date',
};

/**
 * Urgency labels for display
 */
export const URGENCY_LABELS: Record<
  (typeof ANNOUNCEMENT_URGENCY)[number],
  string
> = {
  info: 'Information',
  important: 'Important',
};

/**
 * Announcement form validation schema
 */
export const announcementSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be less than 200 characters'),
    body: z
      .string()
      .min(1, 'Message body is required')
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message must be less than 2000 characters'),
    scope_type: z.enum(ANNOUNCEMENT_SCOPES, { message: 'Scope is required' }),
    scope_date: z.string().nullable().optional(),
    urgency: z.enum(ANNOUNCEMENT_URGENCY),
    visible_from: z.string().optional(),
    visible_until: z.string().nullable().optional(),
    is_active: z.boolean(),
  })
  .refine(
    (data) => {
      // If scope is date_specific, scope_date is required
      if (data.scope_type === 'date_specific') {
        return !!data.scope_date;
      }
      return true;
    },
    {
      message: 'Date is required for date-specific announcements',
      path: ['scope_date'],
    }
  );

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

/**
 * Transform form data for database insertion
 */
export function transformAnnouncementData(
  data: AnnouncementFormData,
  createdBy: string
) {
  return {
    ...data,
    scope_date: data.scope_type === 'date_specific' ? data.scope_date : null,
    visible_from: data.visible_from || new Date().toISOString(),
    visible_until: data.visible_until || null,
    created_by: createdBy,
  };
}
