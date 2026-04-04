# Security Fixes - Phase 1 Priority

## Critical Security Issues That Must Be Fixed Before Production

### **1. Privacy Violation (HIGH PRIORITY)**
**Problem**: Storing exact lat/lng coordinates violates documented privacy policy.

**Files to fix:**
- `src/app/data/prayer-data.ts` - Mock data with exact coordinates
- `src/app/components/world-map.tsx` - Displays exact locations
- Any other components using exact coordinates

**Fix:**
```typescript
// BEFORE (in prayer-data.ts):
{
  id: 1,
  lat: 51.5074,  // Exact latitude
  lng: -0.1278,  // Exact longitude
  city: "London",
  country: "UK"
}

// AFTER:
{
  id: 1,
  city: "London",
  country: "UK",
  // Generate approximate location within city bounds
  approxLat: 51.5,  // Rounded to 0.1 degree (~11km precision)
  approxLng: -0.1   // Rounded to 0.1 degree
}
```

**Acceptance Criteria:**
- [ ] No exact coordinates stored anywhere
- [ ] Map shows approximate locations only
- [ ] Tooltips show city/country, not coordinates
- [ ] Documentation updated to reflect privacy compliance

### **2. Input Validation (HIGH PRIORITY)**
**Problem**: No validation on user inputs (prayer content, forms).

**Files to fix:**
- `src/app/pages/submit.tsx` - Prayer submission form
- Any other forms accepting user input

**Fix:**
```typescript
// Install Zod for validation
// npm install zod

// Create validation schemas:
const prayerSchema = z.object({
  content: z.string()
    .min(10, "Prayer must be at least 10 characters")
    .max(500, "Prayer cannot exceed 500 characters")
    .regex(/^[a-zA-Z0-9\s.,!?'"-]+$/, "Only letters, numbers, and basic punctuation allowed"),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  category: z.enum(['general', 'health', 'family', 'work', 'other'])
});

// Use with React Hook Form
```

**Acceptance Criteria:**
- [ ] All user inputs validated with Zod schemas
- [ ] Error messages shown to users
- [ ] Input sanitization implemented
- [ ] No raw HTML accepted

### **3. XSS Protection (HIGH PRIORITY)**
**Problem**: User content displayed raw (potential XSS vulnerability).

**Files to fix:**
- `src/app/components/prayer-card.tsx` - Displays prayer content
- `src/app/components/feed-card.tsx` - Displays prayer content
- Anywhere user content is rendered

**Fix:**
```typescript
// Install DOMPurify
// npm install dompurify
// npm install @types/dompurify

// Sanitize before rendering:
import DOMPurify from 'dompurify';

const PrayerContent = ({ content }: { content: string }) => {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
  
  return <div>{sanitizedContent}</div>;
};
```

**Acceptance Criteria:**
- [ ] All user-generated content sanitized
- [ ] No HTML allowed in prayers
- [ ] Basic content filtering implemented
- [ ] XSS protection tested

### **4. Dependency Security (MEDIUM PRIORITY)**
**Problem**: 69 dependencies with known vulnerabilities.

**Fix:**
```bash
# 1. Audit current dependencies
npm audit

# 2. Remove unused packages (40+ can be removed)
npm uninstall react-dnd react-dnd-html5-backend recharts html2canvas react-input-otp

# 3. Update critical dependencies
npm install react@latest react-dom@latest
npm install react-leaflet@latest leaflet@latest
npm install lucide-react@latest
```

**Acceptance Criteria:**
- [ ] Dependency count reduced from 69 to ~25
- [ ] Critical security updates applied
- [ ] No high-severity vulnerabilities
- [ ] Bundle size reduced

### **5. Basic Authentication Placeholder (LOW PRIORITY)**
**Problem**: No user session management.

**Fix:**
```typescript
// Create basic user session utility
// src/lib/user-session.ts

export interface UserSession {
  id: string;
  icon: string;
  createdAt: Date;
  prayersSubmitted: number;
  prayersPrayedFor: number;
}

export const createAnonymousUser = (): UserSession => {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    icon: `icon_${Math.floor(Math.random() * 12) + 1}`,
    createdAt: new Date(),
    prayersSubmitted: 0,
    prayersPrayedFor: 0
  };
};

// Store in localStorage for persistence
```

**Acceptance Criteria:**
- [ ] Anonymous user creation
- [ ] Basic session persistence
- [ ] User stats tracking
- [ ] Icon selection

## Implementation Order

### **Week 1 (Immediate):**
1. Fix privacy violation (exact coordinates)
2. Add basic input validation to submit form
3. Sanitize prayer content display

### **Week 2:**
1. Update critical dependencies
2. Remove unused packages
3. Implement user session management

### **Week 3:**
1. Add content filtering/moderator flags
2. Implement rate limiting (client-side)
3. Add security headers configuration

## Testing Security Fixes

### **Manual Tests:**
1. Submit prayer with HTML tags - should be stripped
2. Submit prayer with long content - should be truncated/rejected
3. View map - should show approximate locations only
4. Check browser console for any security warnings

### **Automated Tests (to add):**
```typescript
// Security test examples
describe('Security', () => {
  test('prayer content sanitization', () => {
    const malicious = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizePrayerContent(malicious);
    expect(sanitized).not.toContain('<script>');
  });

  test('input validation', () => {
    const invalidPrayer = { content: 'a'.repeat(600) };
    expect(() => validatePrayer(invalidPrayer)).toThrow();
  });
});
```

## Monitoring & Logging

### **Add basic security logging:**
```typescript
// src/lib/security-logger.ts
export const logSecurityEvent = (event: string, details: any) => {
  console.warn(`[SECURITY] ${event}:`, details);
  // In production, send to monitoring service
};

// Usage:
logSecurityEvent('invalid_input', { field: 'content', reason: 'too_long' });
logSecurityEvent('xss_attempt', { content: maliciousContent });
```

## References

- **OWASP Top 10**: Focus on A1 (Injection), A3 (XSS), A5 (Security Misconfiguration)
- **GDPR/Privacy**: User location data protection
- **Content Safety**: Basic moderation requirements

---

**Status**: Phase 1 Priority  
**Estimated Time**: 8-12 hours  
**Blockers**: None  
**Next**: After security fixes, move to Performance Checklist