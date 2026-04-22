import { z, ZodError } from 'zod';

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
    .regex(/^[\p{L}\p{N}\p{P}\p{Z}]+$/u, { 
      message: "Only letters, numbers, spaces, and punctuation allowed"
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

// User profile schema
export const profileSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username cannot exceed 30 characters" })
    .regex(/^[a-z0-9_]+$/, { 
      message: "Username can only contain lowercase letters, numbers, and underscores" 
    })
    .transform(val => val.toLowerCase())
    .refine(val => val !== "anonymous", { 
      message: "Username 'anonymous' is reserved" 
    }),
  displayName: z.string()
    .max(50, { message: "Display name cannot exceed 50 characters" })
    .regex(/^[a-zA-Z\s\u00C0-\u017F]*$/, { 
      message: "Display name can only contain letters and spaces"
    })
    .optional()
    .default(''),
  icon: z.string()
    .max(20, { message: "Icon selection invalid" })
    .optional(),
});

// Prayer text sanitization helper
export function sanitizePrayerText(text: string): string {
  // Remove any HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  
  // Limit to safe characters (same as validation regex)
  const safeText = withoutHtml.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
  
  // Trim and limit length
  return safeText.trim().slice(0, 500);
}

type PrayerFormData = z.infer<typeof prayerSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

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
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      // Zod v4 uses 'issues' property, not 'errors'
      error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'unknown';
        errors[path] = issue.message || 'Unknown error';

      });

      return { success: false, errors };
    }

    return { success: false, errors: { general: 'Validation failed' } };
  }
}

// Profile validation helper function
export function validateProfile(data: unknown): {
  success: boolean;
  data?: ProfileFormData;
  errors?: Record<string, string>;
} {
  try {
    const validated = profileSchema.parse(data);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'unknown';
        errors[path] = issue.message || 'Unknown error';
      });

      return { success: false, errors };
    }

    return { success: false, errors: { general: 'Validation failed' } };
  }
}