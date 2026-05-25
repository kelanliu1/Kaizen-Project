# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Next.js)
npm run build      # Production build
npm run ts         # Type-check (tsc --noEmit)
npm test           # Run all tests (vitest)
npm run test:watch # Run tests in watch mode
```

Tests use **vitest** with `@testing-library/react` and jsdom. Test files live in `__tests__/` directories adjacent to the code they test.

## Architecture

This is a **Next.js 16 App Router** vehicle rental app ("Kaizen Wheels") using React 18, TypeScript, Tailwind CSS, and shadcn/ui components.

### Data flow

All data is in-memory (no database). The app is effectively client-rendered despite using App Router:

1. **`app/server/data.ts`** — Static vehicle catalog and reservation fixtures. Prices in cents.
2. **`app/server/data_helpers.ts`** — Query functions (filter by time, price, classification, etc.).
3. **`app/server/api.ts`** — Business logic layer (`API` object). Despite living in `server/`, these functions are called directly from client components during render (not via fetch/server actions).
4. **Client components** (`"use client"`) call `API.*` synchronously in render.

### Pages

- `/` → `SearchPage` — date/time pickers + filters sidebar + vehicle results list
- `/review?id=&start=&end=` → `ReviewPage` — quote + reservation confirmation

### Form state

Search uses `react-hook-form` with a shared `FormValues` type (`app/components/search/form.tsx`). The form wraps the entire search page; child components access it via `useFormContext`. Filters reactively update results (no submit button).

### Path aliases

`@/*` maps to `./app/*` (configured in tsconfig).

### UI components

shadcn/ui components live in `app/components/shared/ui/`. Custom components in `app/components/search/` and `app/components/review/`.

## Known issues & planned work

See `.context/` for detailed analysis:
- **`.context/BUG.md`** — Price filter slider bug (max too low + "unlimited" interpretation)
- **`.context/FEATURE_DESIGN.md`** — Discount system design (holiday 17% off, long rental $10/hr off)
