# Price Filter Slider Bug

## Symptoms

Users cannot filter out expensive vehicles:

> "I want to hide results above $125/hr, but I can't figure out how to do that."

> "MY BUDGET IS $100 PER HOUR BUT IT'S SHOWING ME VERY EXPENSIVE CARS???"

## Root Cause

The price filter has two compounding problems:

### 1. Slider max is too low

The `RangeSlider` in `AdditionalFilters.tsx` is hardcoded to `max={100}` (i.e. $100/hr), but several vehicles exceed that rate:

| Vehicle              | Hourly Rate |
|----------------------|-------------|
| Ford Mustang         | $160/hr     |
| BMW X5               | $170/hr     |
| Mercedes-Benz C-Class| $220/hr    |

The slider cannot represent any value above $100.

### 2. Max value doubles as "unlimited"

In `api.ts:79`, when `priceMax === 100` (the slider's maximum), it is treated as "no upper bound":

```ts
const parsedPriceMax = priceMax === 100 ? Number.MAX_SAFE_INTEGER : priceMax;
```

This means:
- Sliding to $100 shows **all** vehicles (no cap) — the "$100+" label in the UI hints at this.
- Sliding to $90 caps at $90/hr, hiding anything above.
- There is no way to set a cap between $100 and $220.

The user who wants "$100 max" literally cannot express that: the value $100 means "unlimited", and $90 is the next option down.

### 3. Default form state starts at the "unlimited" position

`SearchPage.tsx` initializes `price: [10, 100]` — so every user starts with no upper filter, seeing all prices including $220/hr.

## Affected Files

| File | Issue |
|------|-------|
| `app/components/search/AdditionalFilters.tsx:39-40` | Slider `max={100}`, step={10} too coarse |
| `app/server/api.ts:79` | Magic number `100` triggers unlimited interpretation |
| `app/components/search/AdditionalFilters.tsx:35` | Display label uses `maxPrice === 100` for "$100+" |
| `app/components/search/SearchPage.tsx:39` | Default value `[10, 100]` starts at unlimited |

## Proposed Fix

1. **Raise the slider max** to cover the actual price range. Derive it dynamically from vehicle data (round up the max `hourly_rate_cents` to the nearest step), or hardcode a value like `250` that covers all current rates with headroom.

2. **Move the "unlimited" sentinel** to the new max value. Update the check in `api.ts` to compare against the new max, and update the label logic in `AdditionalFilters.tsx` to match.

3. **Adjust step size** for the larger range. A step of `$10` across a `$10–$250` range produces 24 stops, which is usable. Alternatively, use `$25` steps for a cleaner slider.

4. **Update default form values** in `SearchPage.tsx` to use the new max.

### Recommended approach: dynamic max

Compute max from the data so it stays correct if prices change:

```ts
// In API.getFilterOptions() or a new helper:
const maxHourlyDollars = Math.ceil(
  Math.max(...VEHICLES.map(v => v.hourly_rate_cents)) / 100 / 10
) * 10; // round up to nearest $10
```

Pass this to `AdditionalFilters` and `SearchPage` so the slider, default values, sentinel value, and display label all stay in sync.
