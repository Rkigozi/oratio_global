# Screen Specifications

## 1. Purpose

This document defines the structure, behaviour, and states of each screen in the MVP.

It translates product requirements and user flows into clear UI-level specifications to support development.

---

## 2. Onboarding Screen

### Purpose
Allow users to enter the app with minimal friction by selecting a profile icon and display name.

---

### UI Components
- App title (Oratio)
- Subtitle (supportive / welcoming tone)
- Icon selection grid (preset icons)
- Name input field
- “Begin Praying” button

---

### Behaviour
- user must select an icon to proceed
- name input is optional:
  - if empty → system generates default name (e.g. “Anonymous Dove”)
- tapping “Begin Praying”:
  - calls `POST /users`
  - stores `userId` locally (device storage)
  - navigates to Map screen

---

### States
- button disabled when no icon selected
- button active when icon selected
- loading state on submit (optional)

---

## 3. Map Screen

### Purpose
Provide a global, high-level view of prayer activity while preserving user privacy.

---

### UI Components
- interactive world map
- aggregated prayer markers (city / regional level)
- recenter button (return to user location)
- navigation control (to Feed)

---

### Behaviour
- loads data from `GET /map/aggregates`
- markers represent aggregated activity (not individuals)
- user can:
  - zoom
  - pan
- max zoom level is restricted to prevent precise location exposure
- tapping a marker:
  - shows summary (e.g. prayer count, activity level)
  - allows navigation to Feed filtered by location

---

### Recenter Behaviour
- uses device location (if permitted)
- does NOT store exact location in backend
- recenters map to general user area

---

### States
- loading (map + data)
- empty state:
  - “No activity here yet”

---

## 4. Feed Screen

### Purpose
Allow users to browse, filter, and interact with prayer requests.

---

### UI Components
- feed tabs:
  - Global
  - Community (optional / placeholder)
- category filter chips
- sections:
  - Trending
  - Recent
- prayer cards
- optional search / utility icon

---

### Prayer Card Components
- prayer message
- location (city, country)
- category (if present)
- prayer count
- “I Prayed” button
- “Translate” button (if language differs)

---

### Behaviour
- loads from `GET /prayers`
- supports:
  - category filtering
  - tab switching
- trending = highest engagement
- recent = newest submissions

---

### Prayer Interaction
- tapping “I Prayed”:
  - calls `POST /prayers/:id/pray`
  - increments prayer count
  - disables button for that user
  - shows subtle confirmation feedback

---

### Translation Behaviour
- visible when language differs from user locale
- tapping “Translate”:
  - calls translation endpoint
  - displays translated text inline
  - original text remains visible

---

### States
- loading state
- empty state:
  - “No prayers yet — be the first”

---

## 5. Submit Prayer Screen

### Purpose
Allow users to create and submit a prayer request.

---

### UI Components
- multi-line text input (message)
- category selector (optional)
- location display:
  - auto-detected or editable
- anonymous toggle
- submit button

---

### Behaviour
- message is required
- category optional
- location:
  - defaults to detected or last known
  - user can adjust if needed
- anonymous toggle:
  - hides display name in feed
  - does NOT make prayer private

---

### Submit Action
- tapping submit:
  - calls `POST /prayers`
  - validates input
  - returns success response
  - navigates back to Feed or previous screen
  - shows confirmation feedback

---

### States
- disabled button when message empty
- loading state on submit

---

## 6. Profile Screen

### Purpose
Allow users to view and manage their activity and contributions.

---

### UI Components
- profile icon
- display name
- member since
- stats:
  - prayers submitted
  - prayers offered
  - prayers answered
- activity toggle:
  - My Prayers
  - Prayed For
- quick actions:
  - submit prayer
  - browse feed
  - send feedback

---

### Behaviour
- loads from `GET /users/:userId/profile`
- toggle switches between views:
  - user’s own prayers
  - prayers user has interacted with

---

### States
- loading state
- empty states:
  - My Prayers: “You haven’t submitted any prayers yet”
  - Prayed For: “You haven’t prayed for anyone yet”

---

## 7. My Prayers View

### Purpose
Display prayers submitted by the user and allow management actions.

---

### UI Components
- list of prayer cards (owned)
- actions per item:
  - edit
  - mark as answered
  - delete

---

### Behaviour
- loads from `GET /users/:userId/prayers`
- user can:
  - edit (`PATCH /prayers/:id`)
  - mark as answered (`POST /prayers/:id/answered`)
  - delete (`DELETE /prayers/:id`)

---

### States
- empty:
  - “Submit your first prayer”

---

## 8. Prayed For View

### Purpose
Display prayers the user has prayed for.

---

### UI Components
- list of prayer cards
- read-only display

---

### Behaviour
- loads from `GET /users/:userId/prayed-for`
- no edit controls

---

### States
- empty:
  - “You haven’t prayed for anyone yet”

---

## 9. Global Behaviour Rules

### Navigation
Users can move between:
- Map
- Feed
- Submit
- Profile

---

### Ownership Rules
- only owner can:
  - edit
  - delete
  - mark as answered
- non-owners can:
  - pray
  - translate

---

### Privacy Rules
- no exact user location stored or displayed
- only city and country visible
- anonymous hides identity but not content

---

## 10. Core Experience Principle

Every screen should support the core loop:

enter → explore → submit → pray → reflect → return

The UI should remain simple, calm, and focused on meaningful interaction.