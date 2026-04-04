# Project Brief - Oratio Prayer Platform

## Project Identity
- **Project Name**: Oratio Prototype MVP v1.1
- **Code Name**: Oratio_Prototype_MVP
- **Current Status**: Figma-to-Code Prototype (Pre-Production)
- **Target Platform**: Progressive Web App (PWA) with optional native mobile later

## Core Purpose
Oratio is a global Christian prayer platform designed to connect people through shared prayer. The platform enables users to explore prayer activity globally, submit prayer requests, pray for others, and view personal activity.

## Original Vision (From Documentation)
Based on project_scope/MVP-Scope.md:
- **MVP Goal**: Enable users to explore prayer activity globally, submit prayer requests, pray for others, view personal activity
- **Core Features**: Map view, prayer feed, submit prayer, prayer interaction, user profiles
- **Success Criteria**: Users submit prayers, users interact ("I Prayed"), engagement across locations
- **Guiding Principle**: "Launch something real, not perfect"

## Current Reality (As Discovered)
**CRITICAL DISCONNECT**: Documentation describes React Native mobile app with Supabase backend, but actual implementation is React web app with mock data only.

### Current Implementation State:
- **Platform**: React 18 + TypeScript web application (NOT React Native)
- **Build Tool**: Vite (modern build tool)
- **UI Framework**: Mix of Radix UI, MUI Material, and custom components
- **Data Layer**: Mock data only (no backend integration)
- **Deployment**: Not deployed (local development only)

## Strategic Recommendation
**Recommended Direction**: Progressive Web App (PWA) approach
1. **Keep current React web codebase** (good foundation exists)
2. **Add PWA capabilities** for mobile-like experience
3. **Implement Supabase backend** as documented
4. **Option for native apps later** if PWA engagement is high

## Business Objectives
1. **Validate concept** with minimal viable product
2. **Build community** around shared prayer
3. **Maintain privacy** (no exact location storage)
4. **Scale gradually** based on user engagement

## Success Metrics (MVP Phase)
1. **User Engagement**: 100+ prayer submissions in first month
2. **Interaction Rate**: 30%+ of visitors click "I Prayed"
3. **Retention**: 25%+ of users return within 7 days
4. **Geographic Spread**: Prayers from 10+ countries

## Key Constraints
1. **Privacy First**: Never store exact user locations
2. **Lightweight Onboarding**: No mandatory sign-up/login for MVP
3. **Content Safety**: Basic moderation required from day one
4. **Technical Simplicity**: Avoid over-engineering for MVP

## Stakeholder Priorities
1. **User Experience**: Calm, minimal, readable interface
2. **Performance**: Fast loading, responsive design
3. **Reliability**: Core features must work consistently
4. **Scalability**: Architecture should support growth

## Project Timeline Outlook
- **Phase 1 (Foundation)**: 2-4 weeks (make prototype production-ready)
- **Phase 2 (Backend Integration)**: 3-4 weeks (connect to Supabase)
- **Phase 3 (Launch)**: 1-2 weeks (deploy and monitor)
- **Phase 4 (Growth)**: Ongoing (features based on user feedback)

## Critical Success Factors
1. **Solid technical foundation** before backend integration
2. **Clear separation** between prototype code and production code
3. **Comprehensive documentation** for developer handoff
4. **Realistic scope** that can be delivered with available resources

## Risk Assessment
### High Risk:
- **Dependency bloat**: 69 packages, many unused
- **Outdated packages**: React 2 versions behind, security issues
- **Architecture mismatch**: Documentation vs. reality gap
- **No error handling**: Production failures likely

### Medium Risk:
- **Performance issues**: No pagination, large datasets
- **Accessibility gaps**: Missing ARIA labels, contrast issues
- **State management**: Fragmented, hard to maintain

### Low Risk:
- **UI polish**: Good visual foundation exists
- **User flows**: Well-designed from Figma
- **Core functionality**: Basic features implemented

## Next Immediate Actions
1. **Create comprehensive Memory Bank** (this document)
2. **Document all technical debt** and issues
3. **Prepare for developer audit** with clear requirements
4. **Establish cleanup roadmap** before backend work

---
*Last Updated: 2026-04-04*
*Status: Pre-Production Analysis Complete*
*Next Review: After Developer Audit*