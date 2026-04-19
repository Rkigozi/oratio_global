import type { PrayerRequest } from "./prayer-data";
import { mockFeedPrayers } from "./prayer-data";

export interface UserProfile {
  name: string;
  avatar: string;
  photo?: string;
  joinedAt: string;
}

export function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem("oratio_profile");
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {
    // empty
  }
  return { name: "", avatar: "🙏", joinedAt: new Date().toISOString() };
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem("oratio_profile", JSON.stringify(profile));
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

