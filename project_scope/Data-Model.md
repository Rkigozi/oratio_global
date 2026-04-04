# Data Model

## 1. Purpose

This document defines the core data structures required to support the MVP.

This model supports:
- lightweight onboarding
- submitting prayer requests
- responding with “I Prayed”
- displaying prayer activity in the feed and on the map
- translating prayer content
- profile activity tracking
- managing a user’s own prayer requests

The model is intentionally simple and focused on the core prayer loop.

---

## 2. Core Entities

The MVP uses the following core entities:

- User
- PrayerRequest
- PrayerInteraction
- LocationAggregate
- TranslationCache

---

## 3. User

Represents a user of the app.

For MVP, identity is anonymous-first and lightweight.

### Fields

- `id`  
  Unique identifier for the user.

- `displayName`  
  User-editable display name.

- `profileIcon`  
  Preset icon selected during onboarding.

- `deviceLocale`  
  Device language or locale, for example `en`, `fr`, `pt-BR`.

- `memberSince`  
  Timestamp representing when the user first joined.

- `createdAt`  
  Timestamp of user creation.

- `updatedAt`  
  Timestamp of last update.

### Notes

- user is created automatically on first app use
- `id` should be stored locally on the device
- all user activity is tied to this `id`
- no mandatory sign-up or login is required for MVP
- account linking or login can be added later
- custom avatar uploads are out of scope for MVP
- `memberSince` and `createdAt` may be the same value in MVP

---

## 4. PrayerRequest

Represents a prayer request submitted by a user.

### Fields

- `id`  
  Unique identifier for the prayer request.

- `userId`  
  Reference to the submitting user.

- `message`  
  Prayer text content.

- `originalLanguage`  
  Auto-detected language of the submitted message.

- `category`  
  Optional category, for example healing, family, provision.

- `city`  
  City associated with the prayer request.

- `country`  
  Country associated with the prayer request.

- `submitAsAnonymous`  
  Boolean indicating whether the prayer appears anonymously in the UI.

- `prayerCount`  
  Total number of “I Prayed” interactions for this request.

- `status`  
  Current state of the prayer request. Suggested values:
  - `active`
  - `answered`
  - `deleted`

- `answeredAt`  
  Timestamp for when the prayer was marked as answered.

- `deletedAt`  
  Timestamp for when the prayer was deleted.

- `createdAt`  
  Timestamp of creation.

- `updatedAt`  
  Timestamp of last update.

### Rules

- `message` is required
- `message` must respect a max length
- `city` is required
- `country` is required
- only city and country are stored for user-facing location
- precise personal location must not be exposed
- `prayerCount` starts at `0`
- new prayers default to `status = active`

### Notes

- a prayer can still be internally linked to `userId` even if submitted anonymously
- anonymous affects display, not ownership
- answered prayers can remain visible in profile and feed, depending on UI rules
- deleted prayers should be excluded from public feed and map outputs

---

## 5. PrayerInteraction

Represents a single “I Prayed” action.

### Fields

- `id`  
  Unique identifier for the interaction.

- `prayerRequestId`  
  Reference to the prayer request being prayed for.

- `userId`  
  Reference to the user who performed the interaction.

- `createdAt`  
  Timestamp of creation.

### Rules

- one user can only create one interaction per prayer request
- duplicate attempts must be prevented or ignored
- on successful creation:
  - a `PrayerInteraction` record is stored
  - `PrayerRequest.prayerCount` is incremented

### Notes

- this entity is used to track engagement cleanly
- storing both the interaction record and the rolled-up count is acceptable for MVP
- this entity supports the “Prayed For” profile timeline

---

## 6. LocationAggregate

Represents summarised prayer activity for map display.

### Fields

- `id`  
  Unique identifier, for example based on `city + country`.

- `city`  
  City name.

- `country`  
  Country name.

- `prayerRequestCount`  
  Number of visible prayer requests in that location.

- `prayerInteractionCount`  
  Number of prayer interactions in that location.

- `lastActivityAt`  
  Timestamp of latest visible activity in that location.

- `updatedAt`  
  Timestamp of last aggregate update.

### Purpose

- supports fast map rendering
- avoids loading all prayer requests to build the map
- enables grouped, location-safe activity display

### Notes

- aggregation should exclude deleted prayers
- map should never expose precise personal location

---

## 7. TranslationCache

Stores translated versions of prayer messages.

### Fields

- `id`  
  Unique identifier for the translation record.

- `prayerRequestId`  
  Reference to the original prayer request.

- `targetLanguage`  
  Language code for the translated output.

- `translatedText`  
  Translated prayer message.

- `createdAt`  
  Timestamp of creation.

### Rules

- translation is user-triggered only
- original message must always remain available
- if a translation already exists for the same prayer and target language, it should be reused

### Notes

- this reduces repeated API calls
- translation applies only to prayer content, not the full UI

---

## 8. Relationships

### User → PrayerRequest
- one user can submit many prayer requests

### User → PrayerInteraction
- one user can create many prayer interactions

### PrayerRequest → PrayerInteraction
- one prayer request can have many prayer interactions

### PrayerRequest → TranslationCache
- one prayer request can have many cached translations

### LocationAggregate
- summarises many prayer requests and many prayer interactions for one city/country pair

---

## 9. Suggested MVP Schema Shape

### User
- `id`
- `displayName`
- `profileIcon`
- `deviceLocale`
- `memberSince`
- `createdAt`
- `updatedAt`

### PrayerRequest
- `id`
- `userId`
- `message`
- `originalLanguage`
- `category`
- `city`
- `country`
- `submitAsAnonymous`
- `prayerCount`
- `status`
- `answeredAt`
- `deletedAt`
- `createdAt`
- `updatedAt`

### PrayerInteraction
- `id`
- `prayerRequestId`
- `userId`
- `createdAt`

### LocationAggregate
- `id`
- `city`
- `country`
- `prayerRequestCount`
- `prayerInteractionCount`
- `lastActivityAt`
- `updatedAt`

### TranslationCache
- `id`
- `prayerRequestId`
- `targetLanguage`
- `translatedText`
- `createdAt`

---

## 10. Derived Profile Metrics

The following values can be derived at query time and do not require separate storage in MVP:

- `prayersSubmittedCount`
  - count of PrayerRequest where `userId = currentUserId` and `status != deleted`

- `prayersOfferedCount`
  - count of PrayerInteraction where `userId = currentUserId`

- `answeredCount`
  - count of PrayerRequest where `userId = currentUserId` and `status = answered`

---

## 11. Core Logic

### 11.1 Create User

When a new user starts onboarding:

1. create `User`
2. store selected `profileIcon`
3. store `displayName`
4. store `deviceLocale`
5. set `memberSince`
6. return `userId`

---

### 11.2 Submit Prayer

When a user submits a prayer request:

1. validate input
2. detect or assign original language
3. create `PrayerRequest`
4. update the relevant `LocationAggregate`
5. return success

---

### 11.3 “I Prayed”

When a user taps “I Prayed”:

1. check whether a `PrayerInteraction` already exists for that user and prayer request
2. if no interaction exists:
   - create `PrayerInteraction`
   - increment `PrayerRequest.prayerCount`
   - update `LocationAggregate.prayerInteractionCount`
3. return success
4. disable further interaction for that user on that prayer request

---

### 11.4 Mark as Answered

When the owner marks a prayer as answered:

1. confirm ownership
2. update `PrayerRequest.status = answered`
3. set `answeredAt`
4. return success

---

### 11.5 Delete Prayer

When the owner deletes a prayer:

1. confirm ownership
2. update `PrayerRequest.status = deleted`
3. set `deletedAt`
4. exclude prayer from public feed/map views

---

### 11.6 Translate Prayer

When a user taps “Translate”:

1. determine target language from `deviceLocale`
2. check `TranslationCache` for an existing translation
3. if found, return cached translation
4. if not found:
   - call translation service
   - save translation in `TranslationCache`
   - return translated text

---

### 11.7 Map Display

When the map loads:

1. fetch `LocationAggregate` records
2. render markers by city/country
3. use counts and recent activity for marker display
4. tapping a marker can open a summary or filtered feed view

---

## 12. What Is Intentionally Out of Scope

The following are not part of the MVP data model:

- comments
- direct messages
- notifications
- church or group entities
- advanced moderation workflows
- custom avatar uploads
- bookmarks or saved prayers
- full account system and cross-device sync
- full UI localisation settings

---

## 13. Guiding Principle

Only store data that supports the core loop:

enter → explore → submit → pray → reflect → return

If a field or entity does not support that loop, it probably does not belong in the MVP.