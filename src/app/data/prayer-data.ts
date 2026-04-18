export interface PrayerRequest {
  id: string;
  city: string;
  country: string;
  text: string;
  name?: string;
  prayerCount: number;
  lat: number;
  lng: number;
  category?: string;
  createdAt?: string; // ISO timestamp
}

// ── City database ────────────────────────────────────────────────────
// Map hotspots — the map shows trending activity regions, not individual prayers.
// Coordinates are rounded to 0.1 degree (~11km) for privacy protection.
const cityDatabase: Array<{
  name: string;
  country: string;
  lat: number;
  lng: number;
  weight: number; // activity intensity: higher = more trending
}> = [
  // ── North America ──
  { name: "New York", country: "United States", lat: 40.7, lng: -74.0, weight: 5 },
  { name: "Los Angeles", country: "United States", lat: 34.1, lng: -118.2, weight: 3 },
  { name: "Mexico City", country: "Mexico", lat: 19.4, lng: -99.1, weight: 3 },

  // ── South America ──
  { name: "São Paulo", country: "Brazil", lat: -23.6, lng: -46.6, weight: 5 },
  { name: "Bogotá", country: "Colombia", lat: 4.7, lng: -74.1, weight: 2 },
  { name: "Lima", country: "Peru", lat: -12.0, lng: -77.0, weight: 2 },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.4, weight: 2 },

  // ── Europe ──
  { name: "London", country: "United Kingdom", lat: 51.5, lng: -0.1, weight: 5 },
  { name: "Paris", country: "France", lat: 48.9, lng: 2.4, weight: 3 },
  { name: "Berlin", country: "Germany", lat: 52.5, lng: 13.4, weight: 2 },
  { name: "Rome", country: "Italy", lat: 41.9, lng: 12.5, weight: 2 },

  // ── Africa ──
  { name: "Lagos", country: "Nigeria", lat: 6.5, lng: 3.4, weight: 5 },
  { name: "Nairobi", country: "Kenya", lat: -1.3, lng: 36.8, weight: 3 },
  { name: "Accra", country: "Ghana", lat: 5.6, lng: -0.2, weight: 2 },
  { name: "Johannesburg", country: "South Africa", lat: -26.2, lng: 28.0, weight: 2 },
  { name: "Cairo", country: "Egypt", lat: 30.0, lng: 31.2, weight: 2 },

  // ── Middle East ──
  { name: "Istanbul", country: "Turkey", lat: 41.0, lng: 29.0, weight: 2 },
  { name: "Dubai", country: "UAE", lat: 25.2, lng: 55.3, weight: 2 },

  // ── South Asia ──
  { name: "Mumbai", country: "India", lat: 19.1, lng: 72.9, weight: 3 },
  { name: "Delhi", country: "India", lat: 28.7, lng: 77.1, weight: 2 },

  // ── Southeast Asia ──
  { name: "Manila", country: "Philippines", lat: 14.6, lng: 121.0, weight: 5 },
  { name: "Jakarta", country: "Indonesia", lat: -6.2, lng: 106.8, weight: 3 },
  { name: "Bangkok", country: "Thailand", lat: 13.8, lng: 100.5, weight: 2 },

  // ── East Asia ──
  { name: "Seoul", country: "South Korea", lat: 37.6, lng: 127.0, weight: 3 },
  { name: "Tokyo", country: "Japan", lat: 35.7, lng: 139.7, weight: 2 },

  // ── Oceania ──
  { name: "Sydney", country: "Australia", lat: -33.9, lng: 151.2, weight: 2 },
];

// Add jitter to coordinates for privacy (approx +/- 0.05 degrees ~5.5 km)
function addJitter(lat: number, lng: number, seed: number): { lat: number; lng: number } {
  // Simple deterministic pseudo-random based on seed
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jitter = 0.05; // degrees
  return {
    lat: lat + (rand() * 2 - 1) * jitter,
    lng: lng + (rand() * 2 - 1) * jitter,
  };
}

// Get approximate coordinates for a city with deterministic jitter
export function getApproximateCoordinates(cityName: string, country: string): { lat: number; lng: number } {
  const city = cityDatabase.find(c => c.name === cityName && c.country === country);
  if (!city) {
    // Fallback to a random location (should not happen)
    return { lat: 20 + (Math.random() - 0.5) * 40, lng: (Math.random() - 0.5) * 180 };
  }
  // Create a seed from city name and country
  let seed = 0;
  for (let i = 0; i < cityName.length; i++) seed += cityName.charCodeAt(i);
  for (let i = 0; i < country.length; i++) seed += country.charCodeAt(i);
  seed = seed % 1000000;
  return addJitter(city.lat, city.lng, seed);
}

// ── Prayer texts & names ─────────────────────────────────────────────
const prayerTexts = [
  // Health — specific, vulnerable, real
  "My dad was just diagnosed with stage 3 colon cancer. He starts chemo next week and he's scared. Please pray for peace and for the treatment to work.",
  "I've been dealing with chronic migraines for 8 months now. I can barely work. Doctors can't figure it out. I'm exhausted and discouraged — please pray for answers.",
  "My 4-year-old daughter has been in the hospital since Tuesday with a high fever they can't bring down. We're terrified. Please just pray.",
  "Having surgery on my knee Friday morning. I'm nervous but trusting God. Would love prayers for a steady surgeon and quick recovery.",
  "My mom had a stroke last night. She's stable but can't speak right now. I don't know what to do. Please pray for healing and for our family to stay strong.",
  "I've been struggling with anxiety and panic attacks for months. Some days I can't leave the house. Praying for breakthrough and peace that surpasses understanding.",
  "My husband is recovering from a heart attack. He's only 42. We have three kids. Please pray for full recovery and for me to be strong for them.",
  "Been battling insomnia for weeks — my mind won't stop racing. I just need rest. Praying God quiets my thoughts.",

  // Family — raw, honest
  "My wife and I are barely speaking. We've been married 11 years and I don't know how we got here. Please pray we find our way back to each other.",
  "My teenage son told us he wants nothing to do with church anymore. It broke my heart. Praying he finds his way back in his own time.",
  "Going through a really painful divorce. I didn't want this. Please pray for my kids especially — they're confused and hurting.",
  "My sister hasn't spoken to me in two years over something I said. I've apologized but she won't respond. Pray for reconciliation.",
  "We just found out we're pregnant after 3 years of trying and two miscarriages. I'm overjoyed but also terrified. Please pray this baby stays.",
  "My parents are getting older and I'm the only one nearby to help. It's a lot. Pray for patience and for quality time with them while I still can.",
  "Raising three kids alone after my husband passed. Some days I don't know how I'll make it. But God provides. Prayers for strength appreciated.",

  // Career & provision — honest struggles
  "I got laid off two weeks ago. I have a mortgage and two kids in school. Trying to trust God but I'm scared. Please pray doors open quickly.",
  "Starting a new job Monday after being unemployed for 5 months. I'm grateful but nervous. Pray I do well and find good people there.",
  "My small business is barely surviving. I might have to close by end of month. This was my dream. Praying for a miracle or clear direction.",
  "I'm a nurse and I'm completely burned out. I love caring for people but I have nothing left. Pray for rest and renewal.",
  "Waiting to hear back about a job I really want. The interview went well but the waiting is killing me. Pray for God's will to be clear.",
  "I feel stuck in my career. I'm 34 and don't know what I'm supposed to be doing with my life. Praying for direction and courage to make a change.",

  // Guidance & decisions
  "Trying to decide whether to move across the country for a new opportunity. It would mean leaving my church family. I need wisdom.",
  "I feel God calling me into ministry but I have no idea where to start. I'm a software engineer — this makes no sense on paper. Pray for clarity.",
  "My son got accepted to a school we can't afford. He's worked so hard for this. Praying for financial provision or clear direction on what to do.",
  "I've been offered an opportunity that looks great on paper but something in my spirit feels off. Praying for discernment.",
  "Trying to decide if I should go back to school at 38. It would mean sacrificing income for two years. Need wisdom and confirmation.",

  // Peace & mental health — vulnerable
  "I've been having dark thoughts and I finally told someone. Starting counseling next week. Please pray for healing in my mind.",
  "Lost my best friend in a car accident three weeks ago. I can't process it. Some mornings I can't get out of bed. Need prayer just to keep going.",
  "I'm a college student far from home and I've never felt this lonely. I don't have community here yet. Please pray I find my people.",
  "Dealing with guilt over past mistakes that I know God has forgiven, but I can't seem to forgive myself. Praying for freedom.",
  "My anxiety has been really bad this season. I know God is with me but it doesn't always feel like it. Appreciate prayers for peace.",

  // Community & others
  "Our church is going through a painful split. People I love are on both sides. Praying for unity and that no one loses faith over this.",
  "There's a family in our small group who just lost their home in a fire. They have nothing. Please pray for provision and community support.",
  "Praying for my coworker who just found out her husband is having an affair. She's devastated. I don't know what to say — just holding space for her.",
  "My neighbor is a single mom of four and she's been skipping meals so her kids can eat. We've been helping but she needs more. Pray for provision.",
  "A kid in my youth group attempted suicide this week. He's okay physically but the road ahead is long. Please pray for him and his family.",
  "Our pastor is stepping down due to burnout. He gave everything for 15 years. Pray for his rest and for our church to handle the transition well.",
  "Praying for the persecuted church — a friend doing missions in a closed country asked for prayer and I can't share details. God knows.",
  "My friend's husband was deported last month. She's here with two little kids trying to hold it together. Please pray for their family.",

  // Faith & growth
  "I've been going through a season where God feels distant. I'm still showing up but it's dry. Pray for renewed hunger and encounter.",
  "I'm about to lead a Bible study for the first time and I feel completely unqualified. Pray the Holy Spirit does the heavy lifting.",
  "Just got baptized last month at 45 years old. Everything is new. Praying for growth and good mentors in this new walk.",
  "I've been a Christian my whole life but lately I'm questioning everything. Not my faith exactly, just... all the noise around it. Pray for clarity.",
  "Fasting this week and praying for direction. Would love others to agree with me in prayer for breakthrough.",

  // Gratitude-laced requests
  "God provided rent money through a stranger this week. I'm in tears. Still need next month covered but I'm choosing to trust. Pray it continues.",
  "My scan came back clean after a year of treatment. I'm so grateful. Praying it stays that way — six-month follow up is coming.",
  "After 7 years of infertility, we're bringing our adopted daughter home next Tuesday. Please pray for the transition and bonding.",
  "I finally found a church that feels like home after searching for two years. Grateful but praying I actually go deep this time and not hold back.",
  "My prodigal son called today for the first time in a year. He didn't say much but he called. Please pray he keeps reaching out.",
];

// Pool of unique, distinct names — each person appears only once
const feedNames: (string | undefined)[] = [
  // ~15% anonymous
  undefined, undefined, undefined, undefined, undefined,
  undefined, undefined, undefined, undefined, undefined,
  undefined, undefined,
  // Real, diverse, modern names — no repeats
  "Marcus T.", "Jess W.", "David Kim", "Tolu A.", "Sarah Chen",
  "Andre M.", "Priya S.", "Rachel O.", "Kwame B.", "Lina F.",
  "Chris D.", "Nia J.", "Mateo R.", "Hannah P.", "Yusuf K.",
  "Becca L.", "Elijah N.", "Sofia V.", "Caleb H.", "Amara O.",
  "Jordan T.", "Mei Lin", "Isaac G.", "Fatou D.", "Tyler B.",
  "Ruth M.", "Dani C.", "Emmanuel A.", "Grace K.", "Aiden W.",
  "Kenji T.", "Lydia R.", "Samuel O.", "Abby F.", "Omar H.",
  "Esther N.", "Jake P.", "Chloe M.", "Ravi S.", "Naomi B.",
  "Marcus L.", "Joy A.", "Daniel W.", "Aaliyah K.", "Micah R.",
  "Leah T.", "Ben J.", "Miriam C.", "Josiah D.", "Camille P.",
  "Eliana S.", "Kofi M.", "Jasmine H.", "Peter O.", "Rebekah L.",
  "Nate F.", "Zara W.", "Tobias K.", "Mia G.", "Paul N.",
  "Sienna B.", "Ezra T.", "Adele M.", "Gabriel R.", "Hope C.",
  "Ian D.", "Carmen V.", "Malachi J.", "Thandi S.", "Luke A.",
  "Stella K.", "Noah P.", "Imani W.", "Gideon F.", "Elena H.",
  "Declan O.", "Ananya R.", "Bethany L.", "Finn M.", "Zuri T.",
];

// Separate smaller pool for hotspot names (one per city, 26 cities)
const hotspotNames: (string | undefined)[] = [
  undefined, undefined, undefined, undefined,
  "J. Morales", "K. Osei", "S. Nakamura", "R. Fernandes",
  "A. Thompson", "M. Okonkwo", "D. Singh", "L. Petrov",
  "E. Santos", "P. Kim", "T. Williams", "N. Adeyemi",
  "C. Rivera", "H. Zhang", "B. Johnson", "F. Mensah",
  "G. Lopez", "W. Park", "V. Martins", "I. Nguyen",
  "O. Brown", "U. Sato",
];

const CATEGORIES = ["Health", "Family", "Career", "Guidance", "Peace", "Other"];

// ── Seeded random ────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Shuffle an array with a seeded random
function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Map hotspot data (one marker per city) ───────────────────────────
const generateHotspotData = (): PrayerRequest[] => {
  const rand = seededRandom(42);
  const prayers: PrayerRequest[] = [];
  let id = 1;

  // Shuffle hotspot names so assignment is deterministic but not sequential
  const shuffledNames = seededShuffle(hotspotNames, rand);

  for (let i = 0; i < cityDatabase.length; i++) {
    const city = cityDatabase[i];
    const activityLevel = city.weight * 30 + Math.floor(rand() * city.weight * 40);

    const coords = getApproximateCoordinates(city.name, city.country);
    prayers.push({
      id: `hotspot-${id}`,
      city: city.name,
      country: city.country,
      text: prayerTexts[Math.floor(rand() * prayerTexts.length)],
      name: shuffledNames[i % shuffledNames.length],
      prayerCount: activityLevel,
      lat: coords.lat,
      lng: coords.lng,
    });
    id++;
  }

  return prayers;
};

// ── Feed prayer data (individual prayer requests for the feed) ──────
// These are the actionable requests — the map inspires, the feed enables action
const generateFeedData = (): PrayerRequest[] => {
  const rand = seededRandom(777);
  const prayers: PrayerRequest[] = [];
  let id = 1;

  // Shuffle names and texts so each prayer gets a unique person
  const shuffledNames = seededShuffle(feedNames, rand);
  const shuffledTexts = seededShuffle(prayerTexts, rand);
  let nameIdx = 0;
  let textIdx = 0;

  // Reference date: "now"
  const now = new Date("2026-03-10T14:30:00Z");

  for (const city of cityDatabase) {
    // More prayers from higher-weight cities
    const count = city.weight + Math.floor(rand() * 2);
    const coords = getApproximateCoordinates(city.name, city.country);

    for (let j = 0; j < count; j++) {
      // Spread timestamps across the last 48 hours
      const minutesAgo = Math.floor(rand() * 2880); // 0 - 48 hours
      const createdAt = new Date(now.getTime() - minutesAgo * 60 * 1000);

      prayers.push({
        id: `feed-${id}`,
        city: city.name,
        country: city.country,
        text: shuffledTexts[textIdx % shuffledTexts.length],
        name: shuffledNames[nameIdx % shuffledNames.length],
        prayerCount: Math.floor(rand() * 80) + 1,
        lat: coords.lat,
        lng: coords.lng,
        category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
        createdAt: createdAt.toISOString(),
      });
      nameIdx++;
      textIdx++;
      id++;
    }
  }

  // Sort by most recent first
  prayers.sort((a, b) =>
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  return prayers;
};

export const mockHotspots: PrayerRequest[] = generateHotspotData();
export const mockFeedPrayers: PrayerRequest[] = generateFeedData();

// Backwards compat — old map code still uses this
export const mockPrayerRequests = mockHotspots;

export const cities = [...new Set(cityDatabase.map((c) => `${c.name}, ${c.country}`))];

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

export function getCityDatabase() {
  return cityDatabase;
}