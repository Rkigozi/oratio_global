# Project Brief - Oratio Prayer Platform

## Project Identity
- **Project Name**: Oratio
- **Current Phase**: Native App Development (Expo/React Native)
- **Status**: Web PWA prototype complete. Shifting to native mobile app.
- **Target Platform**: iOS first (v2.0), Android (v2.1)

## Core Purpose
Oratio is a global Christian prayer platform that connects people through shared prayer. The platform enables users to explore prayer activity globally, submit prayer requests, pray for others, and view personal activity.

## Current Reality
- **Web PWA (oratiotest.netlify.app)**: Complete prototype — will become informational landing page
- **Native App (Expo/React Native)**: In development — the real product
- **Backend**: Supabase (already configured and ready)
- **Shared Code**: All TypeScript types, API client, validation, utilities carry over from web PWA

## Architecture
```
oratio_global/
├── oratio-web/          # Web PWA → becomes landing/info site
│   ├── src/             # Current web app code
│   └── netlify.toml
└── oratio-app/          # New native app (Expo)
    ├── src/
    │   ├── lib/         # Shared code (types, API, validation, hashtags)
    │   ├── screens/     # Auth, Feed, Submit, Profile, Comments, Map
    │   └── components/  # Reusable UI components
    └── app.json
```

## Business Objectives
1. Ship a real, installable app to the App Store
2. Validate with St Paul's congregation via TestFlight
3. Scale based on engagement

## Key Constraints
1. Privacy First: Never store exact user locations
2. iOS First: Single platform focus for v2.0
3. Shared Code: Maximum reuse from web prototype

## Stakeholder Priorities
1. Authentic app experience (not a web wrapper)
2. Beautiful, calm design matching the web prototype
3. Core prayer loop: submit → feed → pray → comment
4. Push notifications for prayer responses
