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
  const safeText = withoutHtml.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
  
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
  console.log('=== VALIDATION DEBUG ===');
  console.log('Validating data:', data);
  
  // Test regex on text if present
  if (data && typeof data === 'object' && 'text' in data && typeof data.text === 'string') {
    const text = data.text;
    const regex = /^[\p{L}\p{N}\p{P}\p{Z}]+$/u;
    const matches = regex.test(text);
    console.log('Regex test:', { 
      textLength: text.length,
      first10Chars: text.slice(0, 10),
      matches,
      sampleChar: text.charAt(0),
      charCode: text.charCodeAt(0)
    });
    
    // Find first non-matching character
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      if (!regex.test(char)) {
        console.log(`First invalid character at position ${i}: '${char}' (char code: ${char.charCodeAt(0)})`);
        break;
      }
    }
  }
  
  try {
    const validated = prayerSchema.parse(data);
    console.log('Validation passed');
    console.log('=== END VALIDATION DEBUG ===');
    return { success: true, data: validated };
  } catch (error) {
    console.log('Validation error:', error);
    console.log('ZodError structure:', error instanceof ZodError ? error : 'not ZodError');
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
      (error as any).errors?.forEach((err: any) => {
        const path = err.path?.join('.') || 'unknown';
        errors[path] = err.message || 'Unknown error';
        console.log('Zod error:', path, err.message);
      });
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
      console.log('=== END VALIDATION DEBUG (failed) ===');
      return { success: false, errors };
    }
    console.log('=== END VALIDATION DEBUG (non-Zod error) ===');
    return { success: false, errors: { general: 'Validation failed' } };
  }
}