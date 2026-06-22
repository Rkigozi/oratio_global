export interface PrayerRequest {
  id: string;
  city: string;
  country: string;
  text: string;
  name?: string;        // Legacy field - use displayName instead
  displayName?: string; // User's public display name
  username?: string;    // Unique handle (without @) e.g., "prayer_warrior"
  prayerCount: number;
  lat: number;
  lng: number;
  category?: string;
  createdAt?: string; // ISO timestamp
  commentsEnabled?: boolean; // Whether comments are allowed on this prayer
}

export const categoryColors: Record<string, string> = {
  Health: "#67e8f9",
  Family: "#a78bfa",
  Career: "#fbbf24",
  Guidance: "#7c8fff",
  Peace: "#6ee7b7",
  Other: "#8890b5",
};

// Get attribution text for a prayer (username > displayName > legacy name > Anonymous)
export function getAttributionText(prayer: PrayerRequest): string {
  if (prayer.username) return prayer.username;
  if (prayer.displayName) return prayer.displayName;
  if (prayer.name) return prayer.name;
  return "Anonymous";
}

// ── City database ────────────────────────────────────────────────────
export const cityDatabase: Array<{
  name: string;
  country: string;
  lat: number;
  lng: number;
}> = [
  { name: "New York", country: "United States", lat: 40.7, lng: -74.0 },
  { name: "Los Angeles", country: "United States", lat: 34.1, lng: -118.2 },
  { name: "Mexico City", country: "Mexico", lat: 19.4, lng: -99.1 },
  { name: "São Paulo", country: "Brazil", lat: -23.6, lng: -46.6 },
  { name: "Bogotá", country: "Colombia", lat: 4.7, lng: -74.1 },
  { name: "Lima", country: "Peru", lat: -12.0, lng: -77.0 },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.4 },
  { name: "Santiago", country: "Chile", lat: -33.5, lng: -70.7 },
  { name: "Medellín", country: "Colombia", lat: 6.2, lng: -75.6 },
  { name: "London", country: "United Kingdom", lat: 51.5, lng: -0.1 },
  { name: "Paris", country: "France", lat: 48.9, lng: 2.4 },
  { name: "Madrid", country: "Spain", lat: 40.4, lng: -3.7 },
  { name: "Barcelona", country: "Spain", lat: 41.4, lng: 2.2 },
  { name: "Berlin", country: "Germany", lat: 52.5, lng: 13.4 },
  { name: "Rome", country: "Italy", lat: 41.9, lng: 12.5 },
  { name: "Lagos", country: "Nigeria", lat: 6.5, lng: 3.4 },
  { name: "Nairobi", country: "Kenya", lat: -1.3, lng: 36.8 },
  { name: "Accra", country: "Ghana", lat: 5.6, lng: -0.2 },
  { name: "Johannesburg", country: "South Africa", lat: -26.2, lng: 28.0 },
  { name: "Cairo", country: "Egypt", lat: 30.0, lng: 31.2 },
  { name: "Istanbul", country: "Turkey", lat: 41.0, lng: 29.0 },
  { name: "Dubai", country: "UAE", lat: 25.2, lng: 55.3 },
  { name: "Mumbai", country: "India", lat: 19.1, lng: 72.9 },
  { name: "Delhi", country: "India", lat: 28.7, lng: 77.1 },
  { name: "Manila", country: "Philippines", lat: 14.6, lng: 121.0 },
  { name: "Jakarta", country: "Indonesia", lat: -6.2, lng: 106.8 },
  { name: "Bangkok", country: "Thailand", lat: 13.8, lng: 100.5 },
  { name: "Seoul", country: "South Korea", lat: 37.6, lng: 127.0 },
  { name: "Tokyo", country: "Japan", lat: 35.7, lng: 139.7 },
  { name: "Sydney", country: "Australia", lat: -33.9, lng: 151.2 },
];

export const CATEGORIES: string[] = [];

export function getApproximateCoordinates(cityName: string, country: string): { lat: number; lng: number } {
  const city = cityDatabase.find(c => c.name === cityName && c.country === country);
  if (!city) {
    return { lat: 20 + (Math.random() - 0.5) * 40, lng: (Math.random() - 0.5) * 180 };
  }
  let seed = 0;
  for (let i = 0; i < cityName.length; i++) seed += cityName.charCodeAt(i);
  for (let i = 0; i < country.length; i++) seed += country.charCodeAt(i);
  seed = seed % 1000000;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  const jitter = 0.05;
  return {
    lat: city.lat + (rand() * 2 - 1) * jitter,
    lng: city.lng + (rand() * 2 - 1) * jitter,
  };
}

// ── Utilities ────────────────────────────────────────────────────────
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

export const countries = [...new Set(cityDatabase.map(c => c.country))].sort();