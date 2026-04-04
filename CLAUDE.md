# CBSE Class 10 Learning Platform (Vidyaa)

React + TypeScript + Vite education app for CBSE Class 10 board exam prep (Science + Maths).

## Tech Stack
- Frontend: React 19 + TypeScript (strict) + Vite 8
- Backend: Firebase (Firestore, Auth, Cloud Functions, Storage)
- AI: Gemini 2.5 Flash (multimodal) via @google/generative-ai
- Video: YouTube Data API v3 + react-youtube
- Styling: Tailwind CSS v4
- Forms: react-hook-form + zod
- Charts: recharts
- Math: KaTeX
- Animations: framer-motion
- Routing: react-router-dom v6
- Package manager: pnpm

## Architecture
src/
├── components/ui/       # Shared UI primitives (Button, Card, Input, Modal)
├── features/            # Feature modules, each self-contained:
│   ├── auth/            # Auth + onboarding + protected routes
│   ├── tests/           # Question bank + mock test engine
│   ├── videos/          # YouTube player + watch tracking
│   ├── gamification/    # Streaks, XP, leaderboard, badges
│   ├── chat/            # AI doubt solver (Gemini)
│   └── parent/          # Parent dashboard + WhatsApp reports
├── hooks/               # Shared custom hooks (useAuth, useFirestore)
├── services/            # Firebase service layer (ALL SDK calls here)
├── types/               # Shared TypeScript interfaces
├── lib/                 # Config files (firebase.ts, gemini.ts)
├── utils/               # Pure utility functions
├── constants/           # App-wide constants
└── pages/               # Route-level page components

IMPORTANT: NEVER put Firebase/Firestore calls directly in components.
Data flow: Component → Hook → Service → Firebase SDK. No exceptions.

## Commands
pnpm dev              # Vite dev server
pnpm build            # tsc --noEmit + vite build
pnpm preview          # Preview production build
pnpm lint             # ESLint check
pnpm type-check       # TypeScript strict check

## Code Standards
- TypeScript strict mode: no `any`, use `unknown` + type guards
- Functional components only, named exports only
- PascalCase.tsx for components, camelCase.ts for utils/hooks
- Max ~150 lines per component; extract sub-components when exceeded
- Handle loading, error, and empty states for ALL async operations
- Use `import type` for type-only imports
- Use React.lazy() + Suspense for route-level code splitting

## Required Libraries (DO NOT substitute alternatives)
Use ONLY the libraries listed in Tech Stack above. Do NOT add axios, Redux, Zustand, moment.js, styled-components, or Material UI.

## Firebase Conventions
- Firestore: read-heavy denormalized patterns, batch writes for bulk ops
- Security rules: owner-based (request.auth.uid == userId), RBAC for parent access
- Firebase App Check enabled (reCAPTCHA v3)
- Enable offline persistence via Firebase SDK
- Use Firebase Emulator for local development

## Modules (see docs/ for detailed specs)
1. Auth + Profiles: Phone OTP + Google, roles, onboarding → docs/auth-spec.md
2. Question Bank + Tests: Gemini-generated, CBSE format → docs/test-engine-spec.md
3. Video Player: YouTube embed, watch tracking → docs/video-player-spec.md
4. Gamification: XP, streaks, badges, leaderboard → docs/gamification-spec.md
5. AI Doubt Solver: Gemini Socratic tutor → docs/doubt-solver-spec.md
6. Parent Dashboard: Weekly reports + WhatsApp → docs/parent-dashboard-spec.md

## Design Tokens
- Primary: blue-600, Secondary: emerald-500, Accent: amber-500
- Neutrals: slate scale, Error: red-500
- Font: Inter (variable), Math: KaTeX default
- Dark mode via prefers-color-scheme + manual toggle
- Mobile-first responsive (sm: md: lg: breakpoints)

## Performance (Indian Mobile Baseline)
- Lighthouse: ≥90 mobile, LCP <2.5s, INP <200ms, CLS <0.1
- Initial bundle <150KB gzipped; per-route chunks <50KB
- Images: WebP, lazy loading, explicit dimensions
- PWA: offline-first for content

## Security & DPDP Act Compliance (Children's Data)
- Verifiable parental consent before processing student data
- No behavioral tracking or commercial profiling
- Data minimization: collect only educationally necessary data
- Firestore rules: user-scoped + parent reads linked student data

## Accessibility (WCAG 2.1 AA)
- Semantic HTML (button, nav, main) — NEVER div with onClick
- Color contrast ≥4.5:1, visible focus indicators, skip-to-content
- Keyboard navigation, aria-live error messages, logical heading hierarchy

## Workflow
- Always explore existing code before creating new files
- Plan before coding: read relevant doc, propose approach, then implement
- After every task: run pnpm lint && pnpm type-check
- Commit after each completed feature/sub-feature
- Update HANDOFF.md at session end with status and next steps
