# API Behaviours

## 1. Purpose

This document defines the API endpoints, behaviours, and interaction patterns for the MVP.

It ensures:
- consistent data handling
- clear frontend ↔ backend communication
- alignment with the data model and user flows

---

## 2. General Principles

- keep endpoints simple and predictable
- use REST-style conventions
- return only necessary data
- avoid over-fetching
- ensure idempotency where needed
- enforce ownership rules at API level

---

## 3. Authentication (MVP)

### Approach
- lightweight identity (no full auth system)
- `userId` stored locally on device
- passed with requests when needed

---

## 4. Users

### Create User

**POST /users**

#### Request
```json
{
  "displayName": "John",
  "profileIcon": "dove",
  "deviceLocale": "en"
}
```

#### Behaviour
- creates new user record
- assigns unique `userId`
- stores creation timestamp

#### Response
```json
{
  "id": "user_123",
  "displayName": "John",
  "profileIcon": "dove"
}
```

---

## 5. Prayer Requests

### Get Prayers

**GET /prayers**

#### Query Parameters (optional)
- `category`
- `city`
- `country`
- `sort` (trending | recent)

#### Behaviour
- returns list of prayer requests
- sorted based on query
- includes metadata (counts, location)

---

### Create Prayer

**POST /prayers**

#### Request
```json
{
  "userId": "user_123",
  "message": "Please pray for my family",
  "category": "family",
  "city": "London",
  "country": "UK",
  "submitAsAnonymous": false
}
```

#### Behaviour
- validates input (message required)
- creates prayer request
- initializes prayer count = 0
- updates location aggregate

#### Response
```json
{
  "id": "prayer_123",
  "message": "...",
  "status": "active"
}
```

---

## 6. Prayer Interaction

### Pray for a Request

**POST /prayers/:id/pray**

#### Request
```json
{
  "userId": "user_123"
}
```

#### Behaviour
- checks if user already prayed
- if not:
  - creates interaction record
  - increments prayer count
  - updates aggregates
- prevents duplicate interactions

#### Response
```json
{
  "success": true,
  "prayerCount": 12
}
```

---

## 7. Map Data

### Get Aggregates

**GET /map/aggregates**

#### Behaviour
- returns aggregated data by location
- grouped at city / regional level
- includes:
  - number of prayers
  - number of interactions
  - last activity timestamp

#### Response
```json
[
  {
    "city": "London",
    "country": "UK",
    "prayerCount": 120,
    "interactionCount": 450
  }
]
```

---

## 8. Profile

### Get Profile

**GET /users/:userId/profile**

#### Behaviour
- returns:
  - display info
  - counts (submitted, prayed, answered)

---

### Get User Prayers

**GET /users/:userId/prayers**

- returns prayers created by user

---

### Get Prayed For

**GET /users/:userId/prayed-for**

- returns prayers user has interacted with

---

## 9. Prayer Management (Owner Only)

### Edit Prayer

**PATCH /prayers/:id**

- only owner can edit
- updates message/category

---

### Mark as Answered

**POST /prayers/:id/answered**

- updates status = answered
- sets timestamp

---

### Delete Prayer

**DELETE /prayers/:id**

- soft delete (recommended)
- only owner allowed

---

## 10. Translation

### Translate Prayer

**POST /translate**

#### Request
```json
{
  "prayerId": "prayer_123",
  "targetLanguage": "en"
}
```

#### Behaviour
- checks cache first
- if not found:
  - calls translation API
  - stores result
- returns translated text

---

## 11. Error Handling

### General Rules

- return clear, human-readable errors
- avoid exposing internal details

#### Example
```json
{
  "error": "Invalid request"
}
```

---

## 12. Ownership & Security Rules

- userId required for:
  - interactions
  - submissions
- only owner can:
  - edit
  - delete
  - mark as answered
- duplicate interactions are prevented

---

## 13. Performance Considerations (MVP)

- simple queries only
- no pagination required initially (low volume)
- caching used for translations

---

## 14. Guiding Principle

APIs should support a simple, fast experience:

fetch → interact → update → reflect

without unnecessary complexity.