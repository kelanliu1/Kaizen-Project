# Codebase Notes

## Architecture Observations

- The app uses App Router but is effectively fully client-rendered. All pages are `"use client"` components that call `API.*` functions synchronously during render. There are no server actions, no `fetch()` calls, and no RSC data fetching.
- `app/server/` is misleadingly named — nothing in it actually runs on the server. The functions are imported and executed client-side.
- Prices are stored in cents (`hourly_rate_cents`) throughout the data layer but displayed in dollars via `formatCents`.
- The date handling mixes `luxon` (data layer / API) and `date-fns` (components). `DateTime.fromISO()` in api.ts receives ISO strings produced by JS `Date.toISOString()` in components.
- The `RangeSlider` component in `slider.tsx` is a custom wrapper around Radix's single-thumb Slider that renders two thumbs for range selection.

## Price data reference

Hourly rates across all vehicles (for quick reference when working on the price filter bug):
- $32 (Spark), $42 (Civic), $45 (Corolla), $56 (Golf), $58 (Rogue)
- $70 (CX-9), $72 (Santa Fe), $80 (Pacifica), $85 (Wrangler)
- $160 (Mustang), $170 (X5), $220 (C-Class)

Range: $32–$220/hr. The current slider max of $100 cannot represent anything above that.
