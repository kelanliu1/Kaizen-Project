# Refactor Audit

Findings from a codebase audit of the price filter fix and discount feature. Organized by severity.

## High Priority

### 1. Misleading variable names in `api.ts`

**File:** `app/server/api.ts:82-84`

```ts
const parsedPriceMin = priceMin;
const parsedPriceMax = priceMax >= maxPrice ? Number.MAX_SAFE_INTEGER : priceMax;
```

"parsed" implies string-to-number conversion. The min isn't transformed at all, and the max is conditionally expanded. Better names: remove `parsedPriceMin` entirely (just use `priceMin`), rename `parsedPriceMax` to `effectivePriceMax`.

### 2. Magic number `72` in discount logic

**File:** `app/server/discounts.ts:63`

The long rental threshold of 72 hours (3 days) is a bare literal in the eligibility check. Should be a named constant like `LONG_RENTAL_MINIMUM_HOURS`.

### 3. Duplicated duration calculation

**Files:** `app/server/api.ts:34` and `app/server/discounts.ts:59`

Both files independently compute `end.diff(start, "hours").hours || 0`. The discount function recalculates it even though `calculateTotalPrice` already has it. Since `calculateTotalPrice` calls `calculateDiscount`, the duration could be passed as a parameter instead.

### 4. Inconsistent `car` vs `vehicle` naming

**File:** `app/server/data_helpers.ts:35`

The type is `Vehicle`, but the filter callback uses `car`. Should be `vehicle` for consistency with the rest of the codebase.

### 5. Form field `"classification"` is singular but stores an array

**File:** `app/components/search/form.tsx:1`

The `FormValues` type has `classification: string[]` — a plural value in a singular-named field. The API expects `classifications` (plural). This mismatch causes confusion in `VehicleList.tsx` where `form.watch("classification")` is passed as `classifications`.

---

## Medium Priority

### 6. Redundant null-check pattern in `api.ts`

**File:** `app/server/api.ts:136-156`

`getVehicle`, `getReservation`, and `validateReservationAndGetVehicle` all perform the same "find or throw NOT_FOUND" pattern. Could extract a generic `getOrThrow(collection, id, label)` utility.

### 7. `commitMinInput` / `commitMaxInput` are near-duplicates

**File:** `app/components/search/AdditionalFilters.tsx:44-60`

Both functions do: parse → fallback → round to step → clamp → setState → setValue. They differ only in the clamp bounds and which tuple index to update. Could be a single parameterized function.

### 8. Repeated ToggleGroup markup

**File:** `app/components/search/AdditionalFilters.tsx:134-192`

The classification and make filter sections are structurally identical (FormField → ToggleGroup → map items). Only the field name and data source differ. Could extract a `FilterToggleGroup` component.

### 9. Verbose test destructuring in `price-filter.test.ts`

**File:** `app/server/__tests__/price-filter.test.ts:88-109`

Four separate test cases each call `searchByPrice(10, 100)` to assert one vehicle is excluded. Could be a single test with multiple assertions or a `test.each` pattern.

### 10. Duplicated vehicle specs markup

**Files:** `app/components/search/VehicleListItem.tsx:49-66` and `app/components/review/VehicleDetails.tsx:26-39`

Both render year, passengers, and class in `dl/dt/dd` structures with slight layout differences. Could share a `VehicleSpecs` component with a layout prop.

### 11. `getVehicles()` is a no-op wrapper

**File:** `app/server/data_helpers.ts:64-66`

```ts
export const getVehicles = () => { return VEHICLES; };
```

Adds indirection with no logic. Components could import `VEHICLES` directly, or the function could be removed.

---

## Low Priority

### 12. Verbose `initialStartDateAndTime` / `initialEndDateAndTime` names

**File:** `app/components/search/SearchPage.tsx:19-25`

Could be shortened to `defaultStart` / `defaultEnd` since the context (form defaults) is already clear.

### 13. `combineDateTime` name is vague

**File:** `app/components/search/form.tsx:12`

The function merges a `Date` with a time string. A name like `setTimeOnDate` or `dateWithTime` would be clearer.

### 14. Unused `key` prop inside Card

**File:** `app/components/search/VehicleListItem.tsx:39`

`<Card key={vehicle.id} ...>` — the `key` here is meaningless since it's not in a list context. The actual list key is applied by the parent map in `VehicleList.tsx`.

### 15. `formatters.tsx` and `times.ts` are tiny files

**File:** `app/lib/formatters.tsx` (12 lines) and `app/lib/times.ts` (13 lines)

Two very small utility files. Could be merged into a single `lib/utils.ts` to reduce import overhead, though this is largely cosmetic.

### 16. Test helper inconsistency across files

**Files:** `app/server/__tests__/*.test.ts`

- `discounts.test.ts` defines a local `dt()` shorthand for `DateTime.fromISO`
- `price-filter.test.ts` uses full `DateTime.fromISO` directly
- `discount-quote.test.ts` passes ISO strings directly

A shared `test-utils.ts` with common date helpers and filter constants (`ALL_MAKES`, `ALL_CLASSIFICATIONS`, `FAR_START`, `FAR_END`) would reduce repetition across test files.
