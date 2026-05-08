# Architecture Notes

## 1. Purpose

This document defines the technical architecture for the MVP.

It outlines:
- system components
- technology choices
- data flow
- interaction between frontend and backend

The goal is to support fast, simple, and scalable implementation.

---

## 2. Guiding Principles

- keep architecture simple and pragmatic
- prioritise speed of development over perfection
- avoid premature complexity
- use managed services where possible
- align closely with data model and API design
- protect user privacy (especially location data)

---

## 3. High-Level Architecture

The system consists of:

- Mobile App (Frontend)
- Backend (Supabase)
- External Services (Translation API)

### Flow

User → Mobile App → Supabase → Database  
                             ↓  
                     Translation API

---

## 4. Technology Stack

### Frontend
- React Native (Expo)

### Backend
- Supabase

Includes:
- PostgreSQL database
- REST API
- Edge Functions

### External
- Translation API (OpenAI or Google)

---

## 5. Core Components

### Mobile App
- renders UI
- stores userId locally
- calls APIs
- handles user interactions

---

### Supabase Database
Stores:
- users
- prayer requests
- interactions
- aggregates
- translations

---

### API Layer
- REST endpoints (auto-generated)
- Edge functions for logic

---

### Edge Functions
Used for:
- pray interaction logic
- translation
- ownership validation
- aggregate updates

---

## 6. Data Flow

### Onboarding
1. user selects icon + name
2. POST /users
3. store userId locally

---

### Submit Prayer
1. POST /prayers
2. create record
3. update aggregates

---

### Pray Interaction
1. POST /prayers/:id/pray
2. create interaction
3. increment count

---

### Feed Load
1. GET /prayers
2. return filtered results

---

### Translation
1. POST /translate
2. check cache → call API if needed

---

### Profile
1. GET /users/:id/profile
2. return derived stats

---

## 7. Privacy Considerations

- no exact user location stored
- only city + country exposed
- map shows aggregated data only
- anonymous hides identity

---

## 8. Scaling (MVP)

- single backend (Supabase)
- no microservices
- no queueing system

---

## 9. Out of Scope

- real-time systems
- push notifications
- advanced moderation systems
- distributed architecture

---

## 10. Development Approach

### Phase 1
- set up database
- create tables

### Phase 2
- implement core endpoints

### Phase 3
- connect frontend

### Phase 4
- refine UI

---

## 11. Guiding Principle

Build the simplest system that supports:

enter → explore → submit → pray → reflect → return