# Active Context - Oratio Prayer Platform

## Current Phase: Native App Development (Expo/React Native)

**Status**: Web PWA prototype complete (v1.0). Shifting to native mobile app (v2.0).
**Next**: Scaffold Expo project, migrate shared code, build core screens

## What We're Doing
- Building a native iOS app with Expo (React Native)
- Web PWA (oratiotest.netlify.app) → becomes informational landing page
- All shared code (types, API, validation, utilities) carries over

## Active Decisions

### Native App Path
- Expo (managed workflow) — not bare React Native or Capacitor wrapper
- iOS first v2.0, Android v2.1
- TestFlight for St Paul's congregation before App Store launch

### Shared Code Strategy
- All `src/lib/` TypeScript carries over as-is (types, API, validation, hashtags, translation)
- UI layer rebuilt with React Native components
- React Router → Expo Router
- Leaflet → react-native-maps
- Motion → React Native Reanimated

### Web PWA
- Stripped down to become landing/info site
- No longer the primary product
- Keeps oratiotest.netlify.app URL

## What's Built (Web PWA - Complete)
Full prototype with auth, feed, comments, search, hashtags, translation, map, moderation, PWA support.

## What's Next (Native App)
- Scaffold Expo project
- Migrate shared TypeScript code
- Build auth screens (email/Google)
- Build feed, submit, profile, comments screens
- Map integration
- Push notifications
- TestFlight → App Store

## Key Documents
- **Web Code**: `./src/` (current directory)
- **Native App**: `./oratio-app/` (to be created)
- **Memory Bank**: `.clinerules/memory-bank/`
