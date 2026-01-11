/**
 * Player rating validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Rating values (1-5 stars)
 */
export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Rating labels for display
 */
export const RATING_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Developing',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

/**
 * Player rating form validation schema
 */
export const ratingSchema = z.object({
  player_id: z.string().uuid('Invalid player ID'),
  rating_stars: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .nullable()
    .optional(),
});

export type RatingFormData = z.infer<typeof ratingSchema>;

/**
 * Transform form data for database insertion
 */
export function transformRatingData(
  data: RatingFormData,
  ratedByAdminId: string
) {
  return {
    ...data,
    notes: data.notes || null,
    rated_by_admin_id: ratedByAdminId,
  };
}
