import type { PrayerRequest } from "./prayer-data";
import { mockFeedPrayers } from "./prayer-data";

export interface UserProfile {
  username: string;         // Primary identifier (unique handle) e.g., "prayer_warrior"
  displayName: string;      // Changeable display name (defaults to username, can be empty)
  avatar: string;
  photo?: string;
  joinedAt: string;
}

// Helper to generate username from display name (lowercase, underscores, alphanumeric only)
export function generateUsernameFromDisplayName(displayName: string): string {
  // Convert to lowercase
  let username = displayName.toLowerCase();
  // Remove any non-alphanumeric/underscore characters
  username = username.replace(/[^a-z0-9_]/g, '_');
  // Collapse multiple underscores
  username = username.replace(/_+/g, '_');
  // Remove leading/trailing underscores
  username = username.replace(/^_+|_+$/g, '');
  // Ensure minimum length
  if (username.length < 3) {
    username = username.padEnd(3, '_');
  }
  // Truncate to max 30 characters
  return username.slice(0, 30);
}

// Mark username as used (local storage only)
export function markUsernameUsed(username: string): void {
  try {
    const used = JSON.parse(localStorage.getItem('oratio_usernames') || '[]') as string[];
    const lower = username.toLowerCase();
    if (!used.includes(lower)) {
      used.push(lower);
      localStorage.setItem('oratio_usernames', JSON.stringify(used));
    }
  } catch {
    // ignore
  }
}

// Clear all used usernames (for testing/reset)
export function clearUsedUsernames(): void {
  try {
    localStorage.removeItem('oratio_usernames');
    console.log('[Oratio] Cleared used usernames list');
  } catch {
    // ignore
  }
}

// Migrate old profile format (with 'name' field) to new format (displayName + username)
function migrateProfile(oldData: Partial<UserProfile> & { name?: string }): UserProfile {
  // Determine username (required field)
  let username = oldData.username;
  if (!username) {
    // Try to generate from displayName or name
    const displayName = oldData.displayName || oldData.name || "";
    username = displayName ? generateUsernameFromDisplayName(displayName) : "anonymous";
  }
  
  // Determine displayName (defaults to username if empty)
  let displayName = oldData.displayName || oldData.name || "";
  if (!displayName) {
    displayName = username;
  }
  
  return {
    username,
    displayName,
    avatar: oldData.avatar || "🙏",
    photo: oldData.photo,
    joinedAt: oldData.joinedAt || new Date().toISOString(),
  };
}

export function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem("oratio_profile");
    if (raw) {
       const parsed = JSON.parse(raw) as Partial<UserProfile> & { name?: string };
      const migrated = migrateProfile(parsed);
      // Save migrated version back if needed
      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
        saveProfile(migrated);
       }
       markUsernameUsed(migrated.username);
       return migrated;
    }
  } catch {
    // empty
  }
  return { username: "anonymous", displayName: "", avatar: "🙏", joinedAt: new Date().toISOString() };
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem("oratio_profile", JSON.stringify(profile));
  markUsernameUsed(profile.username);
}

export function getSubmittedIds(): string[] {
  try {
    const raw = localStorage.getItem("oratio_submitted");
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // empty
  }
  return [];
}

export function getPrayedIds(): string[] {
  try {
    const raw = localStorage.getItem("oratio_prayed");
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // empty
  }
  return [];
}



export function getStoredSubmittedPrayers(): PrayerRequest[] {
  try {
    const raw = localStorage.getItem("oratio_submitted_prayers");
    if (raw) return JSON.parse(raw) as PrayerRequest[];
  } catch {
    // empty
  }
  return [];
}



export function getAvatarForName(name: string) {
  const avatars = ["🙏", "✝️", "🕊️", "💛", "🌿", "⭐", "🔥", "💜"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return avatars[hash % avatars.length];
}

export const categoryColors: Record<string, string> = {
  Health: "#67e8f9",
  Family: "#a78bfa",
  Career: "#fbbf24",
  Guidance: "#7c8fff",
  Peace: "#6ee7b7",
  Other: "#8890b5",
};

// Helper to get submitted prayers
export function getSubmittedPrayers(): PrayerRequest[] {
  return getStoredSubmittedPrayers()
    .map((p) => ({ ...p, prayerCount: p.prayerCount || 0 }));
}

// Get all prayers (mock feed + user submitted)
export function getAllPrayers(): PrayerRequest[] {
  const submitted = getStoredSubmittedPrayers();
  const submittedIds = new Set(submitted.map(p => p.id));
  const mockPrayers = mockFeedPrayers.filter(p => !submittedIds.has(p.id));
  return [...submitted, ...mockPrayers];
}

// Helper to get prayed-for prayers
export function getPrayedForPrayers(): PrayerRequest[] {
  const prayedIds = new Set(getPrayedIds());
  return getAllPrayers().filter(p => prayedIds.has(p.id));
}

