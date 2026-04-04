import { z } from 'zod';

/**
 * Validation schemas for Oratio Prayer Platform
 * 
 * Security requirements:
 * - Prevent XSS attacks by restricting input characters
 * - Enforce reasonable length limits
 * - Validate all user inputs before processing
 */

// Prayer submission schema
export const prayerSchema = z.object({
  text: z.string()
    .min(10, { message: "Prayer must be at least 10 characters" })
    .max(500, { message: "Prayer cannot exceed 500 characters" })
    .regex(/^[a-zA-Z0-9\s.,!?'"()\-:;\u00C0-\u017F]+$/, { 
      message: "Only letters, numbers, spaces, and basic punctuation allowed"
    })
    .trim(),
  location: z.string()
    .min(2, { message: "Please select a location" })
    .max(100, { message: "Location name too long" }),
  category: z.string()
    .min(1, { message: "Please select a category" })
    .max(50, { message: "Category name too long" }),
  anonymous: z.boolean().default(false),
});

// User profile schema (for future use)
export const profileSchema = z.object({
  name: z.string()
    .min(1, { message: "Name is required" })
    .max(50, { message: "Name cannot exceed 50 characters" })
    .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, { 
      message: "Name can only contain letters and spaces"
    })
    .optional()
    .or(z.literal('')),
  icon: z.string()
    .max(20, { message: "Icon selection invalid" })
    .optional(),
});

// Prayer text sanitization helper
export function sanitizePrayerText(text: string): string {
  // Remove any HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  
  // Limit to safe characters (same as validation regex)
  const safeText = withoutHtml.replace(/[^a-zA-Z0-9\s.,!?'"()\-:;\u00C0-\u017F]/g, '');
  
  // Trim and limit length
  return safeText.trim().slice(0, 500);
}

// Location validation helper
export function isValidLocation(location: string): boolean {
  // Check if location matches "City, Country" format
  const locationRegex = /^[a-zA-Z\s\u00C0-\u017F]+,\s*[a-zA-Z\s\u00C0-\u017F]+$/;
  return locationRegex.test(location) && location.length <= 100;
}

// Validation result type
export type PrayerFormData = z.infer<typeof prayerSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;

// Validation helper function
export function validatePrayerSubmission(data: unknown): {
  success: boolean;
  data?: PrayerFormData;
  errors?: Record<string, string>;
} {
  try {
    const validated = prayerSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}