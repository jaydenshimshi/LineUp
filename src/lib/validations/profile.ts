/**
 * Player profile validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Position type enum values
 */
export const POSITIONS = ['GK', 'DF', 'MID', 'ST'] as const;

/**
 * Position type labels for display
 */
export const POSITION_LABELS: Record<(typeof POSITIONS)[number], string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MID: 'Midfielder',
  ST: 'Striker',
};

/**
 * Player profile form validation schema
 */
export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  age: z
    .number({ message: 'Age is required' })
    .int('Age must be a whole number')
    .min(5, 'Age must be at least 5')
    .max(100, 'Age must be less than 100'),
  main_position: z.enum(POSITIONS, { message: 'Main position is required' }),
  alt_position: z.enum(POSITIONS).nullable().optional(),
  contact_email: z
    .string()
    .email('Please enter a valid email')
    .nullable()
    .optional()
    .or(z.literal('')),
  contact_phone: z
    .string()
    .regex(/^[\d\s\-+()]*$/, 'Please enter a valid phone number')
    .nullable()
    .optional()
    .or(z.literal('')),
  contact_opt_in: z.boolean(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Transform form data for database insertion
 * Converts empty strings to null for optional fields
 */
export function transformProfileData(data: ProfileFormData) {
  return {
    ...data,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    alt_position: data.alt_position || null,
    profile_completed: true,
  };
}
