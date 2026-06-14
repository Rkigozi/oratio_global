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

// Get attribution text for a prayer (username > displayName > legacy name > Anonymous)
export function getAttributionText(prayer: PrayerRequest): string {
  if (prayer.username) return prayer.username;
  if (prayer.displayName) return prayer.displayName;
  if (prayer.name) return prayer.name;
  return "Anonymous";
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
  { name: "Bogotá", country: "Colombia", lat: 4.7, lng: -74.1, weight: 3 },
  { name: "Lima", country: "Peru", lat: -12.0, lng: -77.0, weight: 2 },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.4, weight: 3 },
  { name: "Santiago", country: "Chile", lat: -33.5, lng: -70.7, weight: 2 },
  { name: "Medellín", country: "Colombia", lat: 6.2, lng: -75.6, weight: 2 },

  // ── Europe ──
  { name: "London", country: "United Kingdom", lat: 51.5, lng: -0.1, weight: 5 },
  { name: "Paris", country: "France", lat: 48.9, lng: 2.4, weight: 3 },
  { name: "Madrid", country: "Spain", lat: 40.4, lng: -3.7, weight: 4 },
  { name: "Barcelona", country: "Spain", lat: 41.4, lng: 2.2, weight: 2 },
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

import { generateUsernameFromDisplayName } from "../../lib/username";
import { addHashtagsToMockData } from "../../lib/hashtags";

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
  "I've been struggling with my mental health and finally reached out for help. Starting counseling next week. Praying for courage and healing.",
  "Lost my best friend in a car accident three weeks ago. I can't process it. Some mornings I can't get out of bed. Need prayer just to keep going.",
  "I'm a college student far from home and I've never felt this lonely. I don't have community here yet. Please pray I find my people.",
  "Dealing with guilt over past mistakes that I know God has forgiven, but I can't seem to forgive myself. Praying for freedom.",
  "My anxiety has been really bad this season. I know God is with me but it doesn't always feel like it. Appreciate prayers for peace.",

  // Community & others
  "Our church is going through a painful split. People I love are on both sides. Praying for unity and that no one loses faith over this.",
  "There's a family in our small group who just lost their home in a fire. They have nothing. Please pray for provision and community support.",
  "Praying for my coworker who's going through a really tough time with her marriage. God knows the details. Please pray for wisdom and healing for their family.",
  "My neighbor is a single mom of four and she's been skipping meals so her kids can eat. We've been helping but she needs more. Pray for provision.",
  "A kid in my youth group is really struggling with his mental health. He's getting help now. Please pray for his healing and for the right support around him.",
  "Our pastor is stepping down due to burnout. He gave everything for 15 years. Pray for his rest and for our church to handle the transition well.",
  "Praying for the persecuted church — a friend doing missions in a closed country asked for prayer and I can't share details. God knows.",
  "My friend's husband was deported last month. She's here with two little kids trying to hold it together. Please pray for their family.",

  // Faith & growth
  "I've been going through a season where God feels distant. I'm still showing up but it's dry. Pray for renewed hunger and encounter.",
  "I'm about to lead a Bible study for the first time and I feel completely unqualified. Pray the Holy Spirit does the heavy lifting.",
  "Just got baptized last month at 45 years old. Everything is new. Praying for growth and good mentors in this new walk.",
  "I've been a Christian my whole life but lately I'm questioning everything. Not my faith exactly, just... all the noise around it. Pray for clarity.",
  "Fasting this week and praying for direction. Would love others to agree with me in prayer for breakthrough.",

  // ── Spanish prayers (to test translation) ──
  "Señor, te pido por la salud de mi madre que está en el hospital. Dame fuerza para cuidarla y fe para confiar en tu voluntad. Amén.",
  "Dios mío, estoy pasando por un momento difícil en mi matrimonio. Ayúdanos a encontrar la paz y el amor que una vez tuvimos. Te lo ruego.",
  "Padre celestial, bendice a mis hijos y protégelos de todo mal. Guíalos por el camino correcto y que siempre te tengan en sus corazones.",
  "Señor, necesito tu sabiduría para tomar una decisión importante sobre mi trabajo. No sé qué camino elegir. Ilumíname con tu Espíritu Santo.",
  "Dios, tengo tanta ansiedad que no puedo dormir. Te pido que me des tu paz que sobrepasa todo entendimiento. Calma mi corazón.",
  "Padre, te agradezco por las bendiciones de cada día. Perdóname por mis pecados y ayúdame a ser mejor persona. Te amo Señor.",
  "Señor Jesús, intercede por mi familia que está pasando por una crisis económica. Abre puertas de oportunidad y provee para nuestras necesidades.",
  "Dios todo poderoso, te pido por los enfermos y los que sufren. Trae sanidad y consuelo a sus vidas. Usa mis manos para bendecir a otros.",
  "Padre amado, estoy confundido sobre mi propósito en la vida. ¿Para qué me creaste? Muéstrame el camino que debo seguir.",
  "Señor, te entrego mis miedos y mis dudas. Ayúdame a confiar en ti aunque no entienda tus planes. Aumenta mi fe.",
  "Dios de misericordia, te pido por la paz en nuestro país. Hay tanta violencia y división. Intercede y trae sanidad a nuestra nación.",
  "Gracias Señor por un día más de vida. Ayúdame a vivir este día con gratitud y amor hacia los demás. Que mi vida sea un reflejo de tu amor.",

  // ── French prayers ──
  "Seigneur, je te prie pour la paix dans le monde. Protège ceux qui souffrent et donne-nous ta force pour traverser les moments difficiles.",
  "Père céleste, bénis ma famille et mes amis. Que ton amour nous guide chaque jour et nous garde unis dans la foi.",
  "Je traverse une période difficile avec ma santé. Seigneur, donne-moi la force de guérir et la sagesse aux médecins qui s'occupent de moi.",
  "Mon Dieu, je te confie mes enfants. Protège-les de tout danger et guide-les sur le chemin de la vérité et de l'amour.",

  // ── Portuguese prayers ──
  "Senhor, abençoa o meu trabalho e abre portas de oportunidades. Que eu possa ser uma bênção na vida das pessoas ao meu redor.",
  "Pai amado, cura as feridas do meu coração. Estou passando por uma dor que só Tu conheces. Restaura minha paz e minha alegria.",
  "Deus, te agradeço por mais um dia de vida. Ajuda-me a ser grato em todas as circunstâncias e a confiar nos Teus planos para mim.",

  // ── German prayer ──
  "Herr, ich bitte um Heilung für meine Mutter, die im Krankenhaus liegt. Gib den Ärzten Weisheit und schenke uns Frieden in dieser schweren Zeit.",

  // ── Italian prayer ──
  "Signore, ti prego per la mia famiglia. Aiutaci a rimanere uniti nell'amore e nella fede.",

  // Gratitude-laced requests
  "God provided rent money through a stranger this week. I'm in tears. Still need next month covered but I'm choosing to trust. Pray it continues.",
  "My scan came back clean after a year of treatment. I'm so grateful. Praying it stays that way — six-month follow up is coming.",
  "After 7 years of infertility, we're bringing our adopted daughter home next Tuesday. Please pray for the transition and bonding.",
  "I finally found a church that feels like home after searching for two years. Grateful but praying I actually go deep this time and not hold back.",
  "My prodigal son called today for the first time in a year. He didn't say much but he called. Please pray he keeps reaching out.",
];

// Pool of unique, distinct names — each person appears only once
const feedNames: (string | undefined)[] = [
  // ~13% anonymous
  undefined, undefined, undefined, undefined, undefined,
  undefined, undefined, undefined, undefined, undefined,
  undefined, undefined,
  // Traditional names → "marcus_t" style underscore usernames
  "Marcus T.", "Jess W.", "David Kim", "Tolu A.", "Sarah Chen",
  "Andre M.", "Priya S.", "Rachel O.", "Kwame B.", "Lina F.",
  "Chris D.", "Nia J.", "Mateo R.", "Hannah P.", "Yusuf K.",
  "Jordan T.", "Mei Lin", "Isaac G.", "Fatou D.", "Tyler B.",
  "Ruth M.", "Dani C.", "Emmanuel A.", "Grace K.", "Aiden W.",
  // Full names → "marcus_thompson" style usernames
  "Marcus Thompson", "Jessica Williams", "Andre Martinez",
  "Priya Sharma", "Rachel Okafor", "Kwame Boateng",
  "Mateo Rodriguez", "Hannah Park", "Yusuf Khan",
  // Single-word spiritual → "selah" style (no separator)
  "Selah", "Maranatha", "Koinonia", "Shalom",
  "Jubilee", "Hosanna", "Agape", "Redeemed",
  // Numbers → "grace2024" style (modern social media)
  "Grace2024", "John316", "Psalm23", "Faith22",
  "David877", "Hope121", "Pray4Peace", "Love1Cor13",
  // Initials → "m_j" style compact usernames
  "M.J.", "J.C.", "A.R.", "K.O.",
  "S.N.", "R.F.", "E.S.", "P.K.", "T.W.",
  // Creative compounds → "prayerwarrior" style (no separator)
  "PrayerWarrior", "FaithJourney", "LoveAlive", "HopeRises",
  // Multi-word phrases → "light_bearer" style
  "Light Bearer", "Peace Keeper", "Grace Seeker",
  "Hope Bearer", "Joy Unspeakable", "Love Divine",
  // Spiritual compounds → "jehovahjireh" style
  "JehovahJireh", "ElShaddai", "PrincePeace",
  "AlphaOmega", "Wonderful",
  // Dots/creative → "a_m_e_n" style
  "A.M.E.N.",
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

export const CATEGORIES = ["Health", "Family", "Career", "Guidance", "Peace", "Other"];

// TAGS_BY_CATEGORY and ALL_TAGS were removed — tags are now extracted
// client-side from prayer text via the hashtag utilities.

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
    const nameValue = shuffledNames[i % shuffledNames.length];
    const displayNameValue = nameValue;
    const usernameValue = nameValue ? generateUsernameFromDisplayName(nameValue) : undefined;
    
    prayers.push({
      id: `hotspot-${id}`,
      city: city.name,
      country: city.country,
      text: prayerTexts[Math.floor(rand() * prayerTexts.length)],
      name: nameValue,
      displayName: displayNameValue,
      username: usernameValue,
      prayerCount: activityLevel,
      lat: coords.lat,
      lng: coords.lng,
      commentsEnabled: true,
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

  const shuffledNames = seededShuffle(feedNames, rand);
  const shuffledTexts = seededShuffle(prayerTexts, rand);
  let nameIdx = 0;
  let textIdx = 0;

  const now = new Date("2026-05-09T12:00:00Z");

  for (const city of cityDatabase) {
    const count = city.weight + Math.floor(rand() * 2);
    const coords = getApproximateCoordinates(city.name, city.country);

    for (let j = 0; j < count; j++) {
      const minutesAgo = Math.floor(rand() * 2880);
      const createdAt = new Date(now.getTime() - minutesAgo * 60 * 1000);

      const nameValue = shuffledNames[nameIdx % shuffledNames.length];
      const displayNameValue = nameValue;
      const usernameValue = nameValue ? generateUsernameFromDisplayName(nameValue) : undefined;
      
      const cat = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
      
      prayers.push({
        id: `feed-${id}`,
        city: city.name,
        country: city.country,
        text: addHashtagsToMockData(shuffledTexts[textIdx % shuffledTexts.length]),
        name: nameValue,
        displayName: displayNameValue,
        username: usernameValue,
        prayerCount: Math.floor(rand() * 80) + 1,
        lat: coords.lat,
        lng: coords.lng,
        category: cat,
        createdAt: createdAt.toISOString(),
        commentsEnabled: true,
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