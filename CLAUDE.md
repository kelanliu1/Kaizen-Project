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
3. **`app/server/discounts.ts`** — Holiday/long-rental discount logic. Exports `HOLIDAYS`, `isHoliday`, `containsHoliday`, and `calculateDiscount`.
4. **`app/server/api.ts`** — Business logic layer (`API` object). Despite living in `server/`, these functions are called directly from client components during render (not via fetch/server actions). `getQuote` returns a `PriceQuote` with discount info.
5. **Client components** (`"use client"`) call `API.*` synchronously in render.

### Discount system

Two mutually exclusive discounts (best price wins):
- **Holiday** — 17% off total when a holiday falls strictly within the reservation (not on start/end day).
- **Long rental** — $10/hr off the hourly rate for reservations > 72 hours (3 days).

Holiday list and constants are in `app/server/discounts.ts`. Discounts surface in search results (struck-through rate + label) and the review page (subtotal, discount line, adjusted total).

### Pages

- `/` → `SearchPage` — date/time pickers + filters sidebar + vehicle results list
- `/review?id=&start=&end=` → `ReviewPage` — quote + reservation confirmation with discount breakdown

### Form state

Search uses `react-hook-form` with a shared `FormValues` type (`app/components/search/form.tsx`). The form wraps the entire search page; child components access it via `useFormContext`. Filters reactively update results (no submit button). Price filter has editable text inputs that sync bidirectionally with the range slider.

### Path aliases

`@/*` maps to `./app/*` (configured in tsconfig).

### UI components

shadcn/ui components live in `app/components/shared/ui/`. Custom components in `app/components/search/` and `app/components/review/`.

## Context docs

See `.context/` for detailed analysis and history:
- **`.context/BUG.md`** — Price filter slider bug diagnosis and fix
- **`.context/FEATURE_DESIGN.md`** — Discount system design
- **`.context/REFACTOR.md`** — Refactor audit findings
- **`.context/DECISIONS.md`** — Key decisions and rationale
