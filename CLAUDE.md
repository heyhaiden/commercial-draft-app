# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Commercial Draft App - A React web application built on the Base44 low-code platform. This is a multiplayer draft game with rooms, leaderboards, and scoring functionality.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build to dist/
npm run lint       # ESLint check (components and pages only)
npm run lint:fix   # Auto-fix ESLint issues
npm run typecheck  # TypeScript type checking on JS files
```

## Environment Setup

Create `.env.local` with:
```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
```

## Architecture

### Base44 Platform Integration
- Backend services via `@base44/sdk` (see `src/api/base44Client.js`)
- Pages auto-register from `src/pages/` - add new `.jsx` files there
- `src/pages.config.js` is auto-generated; only `mainPage` is editable
- Changes sync bidirectionally with Base44.com builder

### Key Directories
- `src/pages/` - Route pages (auto-registered)
- `src/components/common/` - Shared app components
- `src/components/game/` - Game-specific components
- `src/components/ui/` - shadcn/ui library (do not edit directly)
- `src/lib/` - Core utilities and context providers

### Authentication Flow
`src/lib/AuthContext.jsx` manages auth state:
- Handles three error types: `auth_required`, `user_not_registered`, custom reasons
- Pages without nav bar defined in `Layout.jsx`: Home, JoinGame, CreateRoom, ProfileSetup, Lobby, Admin, RoomDraft

### State Management
- TanStack Query for server data (configured in `src/lib/query-client.js`)
- React Context for auth state
- React Hook Form for forms with Zod validation

### Path Aliases
`@/*` maps to `./src/*` (configured in `jsconfig.json`)

## Linting Scope

ESLint only runs on `src/components/**` and `src/pages/**`. The following are excluded:
- `src/lib/**/*`
- `src/components/ui/**/*`

## Tech Stack

React 18, Vite, Tailwind CSS, shadcn/ui (Radix primitives), React Router, TanStack Query, Stripe integration, Recharts for data visualization.
