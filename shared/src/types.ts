export interface PrayerRequest {
  id: string;
  city: string;
  country: string;
  text: string;
  name?: string;
  displayName?: string;
  username?: string;
  prayerCount: number;
  lat: number;
  lng: number;
  category?: string;
  createdAt?: string;
  commentsEnabled?: boolean;
}

export interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  photo?: string;
  bio?: string;
  location?: string;
  joinedAt: string;
}

export interface Comment {
  id: string;
  prayer_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user?: { username: string; display_name: string } | null;
}

export interface ProfilePreferences {
  notify_on_prayed: boolean;
  notify_on_comment: boolean;
  language: string;
  comments_enabled_default: boolean;
}

export function getAttributionText(prayer: PrayerRequest): string {
  if (prayer.username) return prayer.username;
  if (prayer.displayName) return prayer.displayName;
  if (prayer.name) return prayer.name;
  return "Anonymous";
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
