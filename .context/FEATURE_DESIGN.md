# Discount System Design

## Requirements

Two discount types that are **mutually exclusive** (best price wins):

### 1. Holiday Discount — 17% off total price
**Condition:** The reservation time range *includes* a holiday, but the reservation does **not** start or end on a holiday (the holiday must fall strictly within the range).

### 2. Long Rental Discount — $10/hr off the hourly rate
**Condition:** The reservation is longer than 3 days (> 72 hours).

### Conflict Resolution
If both discounts apply, use whichever produces the lower total price.

### Visibility
Discounts must be visible:
- In search results (per-vehicle pricing)
- On the review/checkout page (quote breakdown)

## Holiday List

These are fictitious holidays (month-day, recurring annually):

```
Jan 21, Feb 12, Mar 04, May 02, Jun 16,
Jul 26, Aug 03, Sep 01, Nov 05, Dec 18
```

## Data Model

```ts
// app/server/discounts.ts

interface Discount {
  type: "holiday" | "long_rental";
  label: string;                    // e.g. "Holiday Discount (17% off)" or "Long Rental ($10/hr off)"
  originalTotalCents: number;       // price before discount
  discountedTotalCents: number;     // price after discount
  savingsCents: number;             // how much the user saves
}

interface PriceQuote {
  hourlyRateCents: number;
  durationInHours: number;
  totalPriceCents: number;          // final price (after best discount, if any)
  discount: Discount | null;        // null if no discount applies
}
```

## Implementation Plan

### 1. Add holiday data and discount logic (`app/server/discounts.ts`)

New file with:
- `HOLIDAYS` array of `{ month, day }` objects.
- `containsHoliday(start, end)` — returns true if any holiday falls strictly between start and end (exclusive of start/end dates).
- `isHoliday(date)` — returns true if the date matches any holiday.
- `calculateDiscount(start, end, hourlyRateCents)` — evaluates both discount types and returns the best one (or null).

**Holiday check logic:**
```
For each holiday { month, day }:
  For each year in [start.year .. end.year]:
    holidayDate = DateTime(year, month, day)
    if holidayDate > start AND holidayDate < end:
      if start is NOT on a holiday AND end is NOT on a holiday:
        holiday discount qualifies
```

**Long rental check logic:**
```
durationHours = end.diff(start, "hours")
if durationHours > 72:
  long rental discount qualifies
```

**Conflict resolution:**
```
Compute both discounted totals (if eligible), pick the lower one.
```

### 2. Modify `calculateTotalPrice` in `app/server/api.ts`

Update `getQuote` and the returned `PriceQuote` type to include discount information. The `calculateTotalPrice` function should call `calculateDiscount` and return the enriched quote.

### 3. Update search results (`VehicleListItem.tsx`)

For each vehicle in search results, compute the discount for the selected time range and show:
- Original price struck through (if discounted)
- Discounted price with a badge/label indicating the discount type
- The effective hourly rate or total savings

### 4. Update review page (`ReviewPage.tsx`)

The quote breakdown already shows hourly rate, duration, and total cost. Add:
- Discount line item between duration and total (if applicable)
- Show original price struck through, discount label, and savings amount
- Final total reflects the discounted price

### 5. Update `API.searchVehicles` response

The search response should include discount info per vehicle so `VehicleListItem` can display it without re-computing. Either:
- **(A)** Enrich the vehicle list with a `discount` field in the search response, or
- **(B)** Have `VehicleListItem` call a discount helper directly (simpler, consistent with existing pattern where components call API directly)

**Recommendation:** Option (B) — consistent with how the app already works (components call `API.*` directly). Add `API.getDiscountedQuote(vehicleId, startTime, endTime)` that returns the full `PriceQuote` with discount info.

## Edge Cases

- **Reservation starts and ends on the same holiday:** No holiday discount (start/end must not be on a holiday).
- **Reservation spans year boundary:** Check holidays in both years.
- **Duration exactly 72 hours:** Does not qualify for long rental discount (must be *more than* 3 days).
- **Very cheap vehicles:** Long rental discount ($10/hr = 1000 cents/hr) could exceed the hourly rate. Cap the discount so the effective rate doesn't go below $0.
- **Both discounts produce the same price:** Either discount can be chosen; pick holiday discount as convention (or the first evaluated).

## UI Sketch

### Search result card (with discount)
```
┌─────────────────────────────────────┐
│  [img]  Toyota Corolla              │
│         Year: 2020  Class: Compact  │
│         Passengers: 5  Doors: 4     │
│                                     │
│                   ~~$45/hr~~  $35/hr │
│                   Long Rental -$10  │
│                   [Book now]        │
└─────────────────────────────────────┘
```

### Review page quote (with discount)
```
Hourly Rate         $45/hr
Duration            96 hours
Subtotal            $4,320
Long Rental Discount -$960 ($10/hr × 96 hrs)
─────────────────────────────
Total               $3,360
```
