# Oratio Architecture

> Current state: **v1.0 Production Ready**
> Stack: React 19 + TypeScript + Vite + Supabase + Tailwind v4

---

## 1. High-Level Architecture

```mermaid
graph TB
    Browser["Browser / PWA"]
    subgraph CDN["Netlify CDN"]
        Static["Static Assets<br/>(JS, CSS, Icons)"]
        SW["Service Worker<br/>(Workbox)"]
    end
    subgraph React["React 19 SPA"]
        App["App.tsx<br/>ErrorBoundary + Providers"]
        Router["React Router<br/>(Lazy-loaded routes)"]
        Pages["21 Pages"]
        Components["10 Components"]
        Lib["15 Lib Modules"]
    end
    subgraph Supabase["Supabase Backend"]
        Auth["Auth<br/>(Email + Google OAuth)"]
        DB["PostgreSQL<br/>8 Tables + RLS"]
        Edge["Edge Functions<br/>(Translate, Delete Acct)"]
        Storage["Storage<br/>(Avatars)"]
    end
    subgraph Monitoring["Monitoring"]
        Sentry["Sentry<br/>(Error Tracking)"]
        PH["PostHog EU<br/>(Analytics)"]
    end

    Browser --> CDN
    CDN --> React
    React --> Supabase
    React --> Monitoring
```

---

## 2. Route Tree

```mermaid
graph LR
    subgraph Public["Public (No Layout)"]
        L["/landing"]
        O["/onboarding"]
        LI["/login"]
        RP["/reset-password"]
        UP["/update-password"]
        PR["/privacy"]
        T["/terms"]
        PD["/prayer/:id"]
        M["/moderate"]
        UP2["/user/:name"]
    end
    subgraph AppShell["App Shell (Layout → Header + BottomNav)"]
        H["/ (Home - Map)"]
        F["/feed"]
        S["/submit"]
        P["/profile"]
        PC["/profile/circle"]
        PS["/profile/submitted"]
        PP["/profile/prayed"]
        PV["/profile/saved"]
        PST["/profile/settings"]
        I["/info"]
    end
    NF["* → 404 Not Found"]
```

---

## 3. Data Flow

```mermaid
flowchart LR
    subgraph Client["Client (Browser)"]
        Pages["Pages & Components"]
        API["src/lib/supabase-queries.ts<br/>(826 lines - data access layer)"]
        SupaClient["src/lib/supabase.ts<br/>(Supabase client)"]
        Local["localStorage<br/>(16 keys - fallback/optimistic)"]
        Events["CustomEvents<br/>(oratio-prayer-added/removed)"]
    end

    subgraph Server["Supabase"]
        PG["PostgreSQL<br/>Tables + RLS Policies"]
        EF["Edge Functions"]
    end

    Pages --> API
    API --> SupaClient
    SupaClient --> PG
    Pages <--> Local
    Pages <--> Events
    API --> EF
```

### Data Sources by Feature

| Feature | Primary Source | Fallback | Real-time |
|---------|---------------|----------|-----------|
| Prayer Feed | Supabase `prayer_requests` | — | Custom event |
| Submit Prayer | Supabase INSERT | localStorage | Dispatches event |
| Map Hotspots | Supabase `prayer_requests` | — | Custom event |
| Comments | Supabase `comments` | — | — |
| Prayer Circle | Supabase `prayer_circle_invites`, `prayer_circle_connections` | — | — |
| Reports | Supabase `reports` | localStorage | — |
| Saved Prayers | Supabase `saved_prayers` | localStorage | — |
| Profile | Supabase `profiles` | localStorage | — |
| Theme | localStorage | `prefers-color-scheme` | — |

---

## 4. Auth Flow

```mermaid
sequenceDiagram
    participant User
    participant App as React App
    participant Supa as Supabase Auth
    participant Google as Google OAuth
    participant DB as Supabase DB

    User->>App: Click "Sign in with Google"
    App->>Supa: signInWithOAuth(provider: "google")
    Supa->>Google: Redirect to consent page
    User->>Google: Authenticate & approve
    Google->>Supa: Auth code callback
    Supa->>App: Redirect to redirectTo (window.location.origin)
    Note over App: Session restored via getSession()
    App->>DB: Fetch profile from `profiles` table
    DB-->>App: { username, display_name }
    App-->>User: Signed in → redirect to /feed

    alt Email/Password
        User->>App: Enter email + password
        App->>Supa: signInWithPassword()
        Supa-->>App: Session
        App->>DB: Fetch profile
    end
```

---

## 5. Component Tree

```mermaid
graph TB
    App["App.tsx<br/>ErrorBoundary + Providers"]
    App --> Router["RouterProvider"]
    Router --> L["Landing"]
    Router --> O["Onboarding"]
    Router --> LI["Login"]
    Router --> PD["PrayerDetail"]
    Router --> UP["UserProfile"]
    Router --> UL["UserList"]
    Router --> Layout["Layout.tsx"]
    
    Layout --> Header["Header.tsx<br/>Back button + title + logo"]
    Layout --> Outlet["Outlet (page content)"]
    Layout --> BN["BottomNav.tsx<br/>Map | Feed | Submit | Profile"]

    Outlet --> Home["Home.tsx<br/>World Map"]
    Outlet --> Feed["Feed.tsx<br/>Prayer Feed + Search"]
    Outlet --> Submit["Submit.tsx<br/>Prayer Form"]
    Outlet --> Profile["Profile.tsx<br/>User Profile"]
    Outlet --> PI["ProfileSubmitted"]
    Outlet --> PP["ProfilePrayed"]
    Outlet --> PS["ProfileSaved"]
    Outlet --> PST["ProfileSettings"]
    Outlet --> Info["Info.tsx"]

    Feed --> FC["FeedCard.tsx"]
    Profile --> PR["PrayerRow.tsx"]
    PD --> CS["CommentSection.tsx"]
    Home --> WMC["WorldMapClean.tsx<br/>Leaflet"]
```

---

## 6. Library Modules

```mermaid
graph LR
    subgraph Lib["src/lib/"]
        Supa["supabase.ts<br/>Client instance"]
        Auth["auth-context.tsx<br/>Auth state + methods"]
        SQ["supabase-queries.ts<br/>All DB CRUD (826 lines)"]
        API["api.ts<br/>Thin error-wrapper"]
        Val["validation.ts<br/>Zod schemas"]
        Theme["theme-context.tsx<br/>Dark/Light"]
        Trans["translate.ts<br/>Lang detect + Edge fn"]
        Geo["use-geolocation.ts<br/>Geo API + Nominatim"]
        HT["hashtags.tsx<br/>Extract/render/hashtags"]
        Logger["logger.ts<br/>Console + Sentry"]
        Upload["upload.ts<br/>Avatar + UI Avatars"]
        Username["username.ts<br/>Generate handle"]
    end

    SQ --> Supa
    Auth --> Supa
    API --> SQ
    Logger -.-> SQ
    Logger -.-> Auth
```

---

## 7. Database Schema (Supabase)

```mermaid
erDiagram
    profiles {
        uuid id PK
        text username UK
        text display_name
        text avatar_url
        text bio
        text location
        jsonb preferences
        timestamp created_at
    }
    prayer_requests {
        uuid id PK
        uuid user_id FK
        text body
        text category
        text location_city
        text location_country
        float location_lat
        float location_lng
        boolean is_anonymous
        int prayer_count
        boolean comments_enabled
        timestamp created_at
    }
    prayer_interactions {
        uuid id PK
        uuid user_id FK
        uuid prayer_id FK
        timestamp created_at
    }
    comments {
        uuid id PK
        uuid prayer_id FK
        uuid user_id FK
        uuid parent_id FK
        text body
        timestamp created_at
    }
    prayer_circle_invites {
        uuid id PK
        uuid requester_id FK
        uuid recipient_id FK
        text status
        text message
        timestamp created_at
    }
    prayer_circle_connections {
        uuid id PK
        uuid user_a_id FK
        uuid user_b_id FK
        uuid accepted_invite_id FK
        timestamp created_at
    }
    saved_prayers {
        uuid id PK
        uuid user_id FK
        uuid prayer_id FK
        timestamp created_at
    }
    reports {
        uuid id PK
        uuid reportable_id
        text reportable_type
        uuid reported_by FK
        text reason
        text status
        timestamp created_at
    }
    waitlist {
        uuid id PK
        text email UK
        text source
        timestamp created_at
    }

    prayer_requests ||--o{ prayer_interactions : ""
    prayer_requests ||--o{ comments : ""
    prayer_requests ||--o{ saved_prayers : ""
    profiles ||--o{ prayer_requests : ""
    profiles ||--o{ prayer_circle_invites : "requester"
    profiles ||--o{ prayer_circle_invites : "recipient"
    profiles ||--o{ prayer_circle_connections : "user_a"
    profiles ||--o{ prayer_circle_connections : "user_b"
```

---

## 8. localStorage Keys

| Key | Purpose | Type |
|-----|---------|------|
| `oratio_prayed` | Prayer IDs user prayed for | `string[]` |
| `oratio_saved` | Saved prayer IDs | `string[]` |
| `oratio_submitted` | Submitted prayer IDs | `string[]` |
| `oratio_submitted_prayers` | Full submitted prayer objects | `PrayerRequest[]` |
| `oratio_reports` | Offline report fallback | `Report[]` |
| `oratio_profile` | Legacy profile data | `UserProfile` |
| `oratio_theme` | Dark/light preference | `"dark" \| "light"` |
| `oratio_location` | Cached geolocation | `sessionStorage` |
| `oratio_recent_searches` | Last 10 searches | `string[]` |
| `oratio_feed_visited` | Welcome tip dismissed | `boolean` |
| `oratio_last_prayer_location` | Last submit location | `object` |

---

## 9. Monitoring

```mermaid
flowchart LR
    subgraph Client
        App["React App"]
        BC["Browser Console"]
    end
    subgraph Sentry_integration
        EB["ErrorBoundary.tsx<br/>componentDidCatch"]
        LOG["logger.ts<br/>logError()"]
        INIT["main.tsx<br/>Sentry.init()"]
    end
    subgraph PostHog_integration
        PH_init["main.tsx<br/>posthog.init()"]
        EVENTS["8 custom events<br/>auth, prayers, comments, search"]
    end
    subgraph External
        Sentry_dash["sentry.io/oratio-3j"]
        PH_dash["eu.posthog.com"]
    end

    App --> EB
    App --> LOG
    EB --> INIT
    LOG --> INIT
    INIT --> Sentry_dash
    App --> PH_init
    App --> EVENTS
    PH_init --> PH_dash
    EVENTS --> PH_dash
    LOG --> BC
```

### Captured Events
- `user_signed_up` / `user_signed_in` (email or Google)
- `prayer_submitted` (with city, country, anonymous flag)
- `prayer_prayed` / `prayer_unprayed`
- `prayer_saved` / `prayer_unsaved`
- `prayer_reported` (with reason)
- `comment_added` (with reply flag)
- `search_performed` (with query text)

---

## 10. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Library | Tailwind v4 + CSS vars | Zero runtime, custom theming, small bundle |
| Animations | `motion` (Framer Motion successor) | Spring physics, AnimatePresence, tree-shakeable |
| Routing | React Router v7 + `lazy()` | Full code splitting per route |
| Icons | `lucide-react` | Tree-shakeable, consistent style |
| Drawers | `vaul` | Mobile-native feel, touch-optimized |
| Map | Leaflet (canvas-rendered) | Free, no API key needed, lightweight |
| Forms | Native + Zod validation | No form library overhead |
| State | React hooks + localStorage | Minimal for current scale |
| Auth | Supabase Auth | Built-in OAuth, RLS integration |
| Translation | Supabase Edge Function | API key stays server-side |
| Error tracking | Sentry | Free tier, React integration |
| Analytics | PostHog (EU) | Open source, privacy-compliant |
| Deployment | Netlify | SPA-friendly, auto-deploy from git |
| Testing | Vitest + Testing Library | Fast, Vite-native, 50 tests |

---

## 11. File Map

```
src/
├── main.tsx                        # Entry — Sentry + PostHog init, render App
├── sw.ts                           # Service worker (Workbox precaching)
├── vite-env.d.ts                   # Env var type declarations
├── styles/
│   ├── tailwind.css                # Tailwind v4 entry
│   ├── theme.css                   # Design tokens (RGB vars, dark/light)
│   └── index.css                   # Animations, Leaflet imports
├── lib/
│   ├── supabase.ts                 # Supabase client (6 lines)
│   ├── auth-context.tsx            # Auth state + methods (130 lines)
│   ├── supabase-queries.ts         # All DB operations (826 lines)
│   ├── api.ts                      # Error wrapper (66 lines)
│   ├── validation.ts               # Zod schemas + sanitizer (117 lines)
│   ├── theme-context.tsx           # Dark/light theme (104 lines)
│   ├── logger.ts                   # Error logging (14 lines)
│   ├── translate.ts                # Language detection + Edge fn (77 lines)
│   ├── use-geolocation.ts          # Geo API hook (74 lines)
│   ├── hashtags.tsx                # Hashtag utilities (97 lines)
│   ├── upload.ts                   # Avatar handling (32 lines)
│   └── username.ts                 # Username generator (8 lines)
├── app/
│   ├── App.tsx                     # Root — providers + UpdatePrompt
│   ├── routes.tsx                  # Route definitions (21 routes)
│   ├── components/
│   │   ├── layout.tsx              # App shell (15 lines)
│   │   ├── header.tsx              # Top bar (80 lines)
│   │   ├── bottom-nav.tsx          # Tab bar (61 lines)
│   │   ├── feed-card.tsx           # Feed prayer card (120 lines)
│   │   ├── prayer-row.tsx          # Compact prayer row (156 lines)
│   │   ├── world-map-clean.tsx     # Leaflet map (282 lines)
│   │   ├── comment-section.tsx     # Threaded comments (297 lines)
│   │   ├── crisis-resources.tsx    # Helpline accordion (97 lines)
│   │   ├── error-boundary.tsx      # Error boundary (57 lines)
│   │   └── loading-spinner.tsx     # Spinner + error state (45 lines)
│   ├── pages/
│   │   ├── landing.tsx             # Marketing page (203 lines)
│   │   ├── onboarding.tsx          # Sign up (170 lines)
│   │   ├── login.tsx               # Sign in (128 lines)
│   │   ├── reset-password.tsx      # Reset request (133 lines)
│   │   ├── update-password.tsx     # New password (170 lines)
│   │   ├── home.tsx                # Map page (286 lines)
│   │   ├── feed.tsx                # Prayer feed (775 lines)
│   │   ├── submit.tsx              # Submit prayer (456 lines)
│   │   ├── profile.tsx             # User profile (463 lines)
│   │   ├── profile-submitted.tsx   # Submitted prayers (294 lines)
│   │   ├── profile-prayed.tsx      # Prayed-for prayers (196 lines)
│   │   ├── profile-saved.tsx       # Saved prayers (212 lines)
│   │   ├── profile-settings.tsx    # Settings (285 lines)
│   │   ├── prayer-detail.tsx       # Full prayer view (489 lines)
│   │   ├── user-profile.tsx        # Other user's profile (200 lines)
│   │   ├── prayer-circle.tsx       # Mutual Prayer Circle invites/connections
│   │   ├── moderate.tsx            # Moderation dashboard (136 lines)
│   │   ├── info.tsx                # Beta info (250 lines)
│   │   ├── terms.tsx               # Terms of service (63 lines)
│   │   ├── privacy.tsx             # Privacy policy (58 lines)
│   │   └── not-found.tsx           # 404 page (24 lines)
│   └── data/
│       ├── prayer-data.ts          # Prayer types, city DB, mock data (396 lines)
│       └── profile-data.ts         # Legacy localStorage profile (229 lines)
├── test/
│   ├── setup.ts
│   └── ... (test files co-located with source)
```

---

## 12. Supabase RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Everyone | — | Own row | — |
| `prayer_requests` | Everyone | Authenticated | Owner only | Owner only |
| `prayer_interactions` | Everyone | Own | — | Own |
| `comments` | Everyone | Authenticated | — | Own |
| `prayer_circle_invites` | Participants | Requester | RPC only | RPC only |
| `prayer_circle_connections` | Participants | RPC only | — | Participants |
| `saved_prayers` | Own | Own | — | Own |
| `reports` | Everyone | Authenticated | Mod Only | — |
| `waitlist` | — | Anyone | — | — |
