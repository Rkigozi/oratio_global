import type { PrayerRequest } from "./prayer-data";

export interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  photo?: string;
  bio?: string;
  location?: string;
  joinedAt: string;
}

import { generateUsernameFromDisplayName } from "../../lib/username";

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
    bio: oldData.bio || "",
    location: oldData.location || "",
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



export const categoryColors: Record<string, string> = {
  Health: "#67e8f9",
  Family: "#a78bfa",
  Career: "#fbbf24",
  Guidance: "#7c8fff",
  Peace: "#6ee7b7",
  Other: "#8890b5",
};

// Helper to get prayed-for prayers (from localStorage submitted prayers only)
export function getPrayedForPrayers(): PrayerRequest[] {
  const prayedIds = new Set(getPrayedIds());
  return getStoredSubmittedPrayers().filter(p => prayedIds.has(p.id));
}

// Check if username is available (optionally exclude current username)
export function isUsernameAvailable(username: string, excludeUsername?: string): boolean {
  try {
    const used = JSON.parse(localStorage.getItem('oratio_usernames') || '[]') as string[];
    const lower = username.toLowerCase();
    const filtered = excludeUsername ? used.filter(u => u !== excludeUsername.toLowerCase()) : used;
    return !filtered.includes(lower);
  } catch {
    return true;
  }
}

// ── Session management ─────────────────────────────────────────────

export type UserSession = "no-profile" | "active" | "signed-out";

export function getSessionState(): UserSession {
  try {
    const profile = localStorage.getItem("oratio_profile");
    if (!profile) return "no-profile";
    const parsed = JSON.parse(profile) as { username?: string };
    if (!parsed.username || parsed.username === "anonymous") return "no-profile";
    const session = localStorage.getItem("oratio_session");
    return session === "signed-out" ? "signed-out" : "active";
  } catch {
    return "no-profile";
  }
}

// Check if Supabase session is active (used by auth context and layout)
export function hasSupabaseSession(): boolean {
  try {
    const raw = localStorage.getItem("sb-" + import.meta.env.VITE_SUPABASE_URL?.split("//")[1]?.split(".")[0] + "-auth-token");
    return !!raw;
  } catch {
    return false;
  }
}

export function logoutProfile(): void {
  try {
    // Remember who signed out so login page can hint
    const profile = localStorage.getItem("oratio_profile");
    if (profile) {
      const parsed = JSON.parse(profile) as { username?: string };
      if (parsed.username && parsed.username !== "anonymous") {
        localStorage.setItem("oratio_last_user", parsed.username);
      }
    }
    localStorage.setItem("oratio_session", "signed-out");
  } catch {
    // ignore
  }
}

export function loginProfile(username: string): boolean {
  try {
    const raw = localStorage.getItem("oratio_profile");
    if (!raw) return false;
    const profile = JSON.parse(raw) as { username?: string };
    if (profile.username?.toLowerCase() === username.toLowerCase()) {
      localStorage.removeItem("oratio_session");
      localStorage.removeItem("oratio_last_user");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  try {
    const keys = [
      "oratio_profile",
      "oratio_session",
      "oratio_last_user",
      "oratio_submitted",
      "oratio_submitted_prayers",
      "oratio_prayed",
      "oratio_saved",
      "oratio_reports",
      "oratio_usernames",
    ];
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}



