
# Oratio - Global Prayer Platform

Oratio is a global Christian prayer platform designed to connect people through shared prayer. This MVP enables users to explore prayer activity globally, submit prayer requests, pray for others, and view personal activity.

## Project Status

**Status**: Pre-Production Analysis Complete  
**Phase**: Developer Audit Preparation  
**Target Platform**: Progressive Web App (PWA) with mock data  
**Git Repository**: Initialized ✅

## Key Features

- **Interactive World Map**: Visual discovery of prayer hotspots (React Leaflet)
- **Prayer Feed**: Filterable feed with trending prayers, categories, search
- **Submit Prayers**: Simple form with location, category, optional name
- **User Profiles**: Track submitted prayers, prayed-for prayers, answered prayers
- **Community Interactions**: "I Prayed" button, following users, sharing
- **Privacy-First**: No exact location storage (city/country only)

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + CSS Variables (design tokens)
- **UI Components**: Radix UI primitives + custom components
- **Maps**: React Leaflet with custom hotspots
- **Animations**: Framer Motion (Motion)
- **Forms**: React Hook Form + validation
- **Routing**: React Router v7
- **State**: React hooks + localStorage (mock data)

## Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Modern browser with ES2022 support

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Oratio_Prototype_MVP

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# TypeScript type checking
npm run type-check
```

## Project Structure

```
Oratio_Prototype_MVP/
├── src/
│   ├── app/                    # Main application
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components (Home, Feed, Submit, Profile)
│   │   ├── data/              # Mock data generation
│   │   └── routes.ts          # React Router configuration
│   ├── styles/                # CSS, Tailwind config, design tokens
│   └── lib/                   # Utilities, error handling
├── project_scope/             # Project documentation
├── .clinerules/memory-bank/   # Development context and documentation
└── guidelines/                # Design guidelines
```

## Development Workflow

### Current State
- ✅ Project analysis complete
- ✅ Memory Bank documentation established
- ✅ Dependencies installed and project runs
- ✅ Git repository initialized with initial commit
- ✅ Scrolling issues fixed (Feed & Profile pages)
- ✅ Basic error handling implemented
- ✅ Development tools configured (ESLint, Prettier, TypeScript)

### Next Steps (Phase 2: Foundation Cleanup)
1. **Dependency Cleanup**: Remove unused packages (40+ can be removed)
2. **Design Tokens**: Implement CSS variables for consistent theming
3. **Component Architecture**: Restructure for atomic design pattern
4. **Performance Improvements**: Add pagination, code splitting
5. **Testing Setup**: Add Jest + React Testing Library

### Phase 3: Backend Integration
1. **Supabase Setup**: PostgreSQL database, authentication, storage
2. **API Layer**: Migrate from mock data to real API calls
3. **State Management**: Implement Zustand + React Query
4. **PWA Configuration**: Web manifest, service worker, offline support

## Key Documentation

- **Memory Bank**: Comprehensive project context in `.clinerules/memory-bank/`
- **Project Scope**: MVP requirements, user flows, data model in `project_scope/`
- **Developer Audit**: Preparation document in `developer-audit-package.md`
- **Design System**: Visual guidelines in `project_scope/Design-System.md`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (PWA-ready)

## Known Issues & Technical Debt

### Critical (Fix Before Production)
- **Privacy Violation**: Exact coordinates stored in mock data (contradicts documentation)
- **Security**: No input validation, XSS vulnerabilities
- **Performance**: No pagination, loads all data at once
- **Dependencies**: 69 packages, many unused; React 2 versions behind

### Medium Priority
- **Code Quality**: Inline styles, mixed UI libraries, no separation of concerns
- **State Management**: Fragmented, localStorage as database
- **Error Handling**: Empty catch blocks, no error boundaries
- **Testing**: No unit/integration tests

### Low Priority
- **Accessibility**: Missing ARIA labels, contrast issues
- **UI Consistency**: Minor visual inconsistencies
- **Documentation**: Missing component documentation

## Contributing

1. **Fork the repository** and create a feature branch
2. **Follow coding standards**:
   - ESLint + Prettier configuration
   - TypeScript strict mode compliance
   - Component documentation
3. **Write tests** for new features
4. **Update documentation** including Memory Bank
5. **Submit pull request** with clear description

## License

All rights reserved. This is a prototype for the Oratio prayer platform.

## Contact

For development inquiries, refer to the Memory Bank documentation for context and next steps.

---

**Important**: This is a prototype with mock data only. Backend integration (Supabase) is required for production deployment.
  