# Decisions

## 1. Price Slider Bug Fix

The price filter slider was hardcoded to a max of $100, but three vehicles had rates up to $220/hr. Worse, the value $100 doubled as an "unlimited" sentinel in the API layer, so users could never actually cap results at $100 — it silently meant "show everything." We replaced the hardcoded max with a dynamic value computed from the vehicle catalog (`getFilterOptions().maxPrice`), moved the unlimited sentinel to that dynamic max, and added editable text inputs alongside the slider so users can type exact dollar amounts.

## 2. Refactor

We audited the codebase for issues that would confuse a new developer or introduce subtle bugs, then applied fixes in priority order.

### High priority

- **Magic number for long rental threshold.** The bare literal `72` in the discount eligibility check was replaced with a named constant `LONG_RENTAL_MINIMUM_HOURS`. Without the constant, a developer would have to trace the business requirement to understand why 72 matters.
- **Misleading variable names.** `parsedPriceMin` was a direct alias of `priceMin` with no parsing, and `parsedPriceMax` was a conditional expansion, not a parse. We removed the useless alias and renamed the other to `effectivePriceMax` so the name matches what the code actually does.
- **Duplicated duration calculation.** Both `calculateTotalPrice` (api.ts) and `calculateDiscount` (discounts.ts) independently computed `end.diff(start, "hours")`. Since the API layer already has the value, we passed it as a parameter to avoid the redundant computation.
- **Inconsistent `car` vs `vehicle` naming.** The data type is `Vehicle` but `data_helpers.ts` used `car` in its filter callbacks. We renamed to `vehicle` throughout for consistency.
- **Singular form field storing plural data.** The form field was named `classification` (singular) but held a `string[]`, and the API expected `classifications` (plural). We renamed the form fields to `classifications` and `makes` so the names match their types and the API parameters.

### Medium priority

- **Near-duplicate commit functions.** `commitMinInput` and `commitMaxInput` in AdditionalFilters were structurally identical — parse, round, clamp, set state, update form — differing only in bounds. We consolidated them into a single `commitPriceInput(raw, "min" | "max")` to eliminate the duplication.

### Low priority

- **Verbose variable names.** `initialStartDateAndTime` / `initialEndDateAndTime` shortened to `defaultStart` / `defaultEnd` since the context already makes the meaning clear.
- **Vague function name.** `combineDateTime` renamed to `setTimeOnDate` to better describe what it does (sets hours/minutes from a time string onto a Date).
- **Unused `key` prop.** `VehicleListItem` had `key={vehicle.id}` on its inner `<Card>`, but the actual list key is applied by the parent `.map()` in `VehicleList`. Removed the redundant prop.

## 3. UX Callouts

- **Sliders lack text input alternatives.** The price slider originally had no editable text fields, forcing users to drag to set values — imprecise and frustrating. We added editable inputs for the price filter, but the passenger slider still has the same problem and should get one too.
- **Class and Make filters need a "Clear All" option.** The "Reset all" button toggles every option ON, but there's no way to clear all selections and start fresh. Users who want only one or two specific makes have to manually unclick everything else, which is tedious. A "Clear All" button (or toggling the current button to deselect all) would let users opt-in to exactly what they want.
- **Drop-off date picker doesn't follow the pick-up date.** If a user selects a start date a month in the future, the end date picker still opens to the current month. The end date picker should default to showing the same month as the selected start date so users don't have to navigate forward manually.
- **Filters are lost on back navigation.** Clicking "Book Now" navigates to the review page, and hitting the browser back button resets all filters to defaults. Search state should be preserved (e.g. via URL query params or session storage) so users can return to their filtered results without re-entering everything.

## 4. UI/UX Callouts by Claude

- **No result count.** When filters narrow the list, users have no "X vehicles found" indicator — they just see fewer cards with no context on how restrictive their filters are.
- **No sorting.** Search results have no way to sort by price, year, or passenger count. Users scanning for the cheapest option have to visually scan the entire list.
- **Only hourly rate shown in search results, not estimated total.** For a 4-day rental, seeing "$45/hr" is less useful than also seeing "~$4,320 total." Users have to do mental math to compare.
- **Time picker is a raw text field.** Users have to type `HH:mm` manually with no dropdown or preset intervals (e.g. every 30 minutes). Easy to misformat.
- **No active filter indicators on mobile.** Filters are behind a Sheet drawer, but there's no badge or count showing how many filters are active — users forget what they've set.
- **Confirm reservation is a dead button.** `handleConfirm` logs an error to the console with no user feedback. At minimum it should show a toast or disabled tooltip explaining it's not yet implemented.

## 5. Technical Tradeoffs

### Bug fix

- **O(N) `getFilterOptions()` called inside every search.** `searchVehicles` calls `getFilterOptions()` on each invocation to get `maxPrice` for the unlimited sentinel check. This iterates the full vehicle array to compute the max each time. For 12 vehicles it's trivial, but the pattern wouldn't scale — a memoized or cached value would be better if the catalog grows.
- **State sync for editable inputs runs during render.** The `if` checks that sync slider values → input fields execute during render rather than in a `useEffect`. This is technically an anti-pattern, but avoids the extra render cycle that `useEffect` would cause. The tradeoff is slightly harder-to-follow control flow in exchange for snappier UI updates.

### Discount feature

- **`API.getQuote` called per vehicle in search results.** Each `VehicleListItem` independently calls `getQuote` to get discount info, meaning `calculateDiscount` runs 12 times on every filter change. We chose this (option B from FEATURE_DESIGN.md) for consistency with the existing pattern where components call `API.*` directly. The alternative — enriching the search response with discount data — would be a single pass but would change the search API contract.
- **Discount computed at render time, not cached.** If the same vehicle+time range is re-rendered (e.g. parent re-render from an unrelated filter change), the discount is recalculated from scratch. Acceptable for in-memory data but wouldn't work with a real backend without memoization.
- **`Math.round` on holiday discount introduces rounding.** `originalTotal * 0.83` can produce fractional cents. We round once at computation time, which means `savingsCents + discountedTotalCents` always equals `originalTotalCents` exactly. The tradeoff is the discount percentage isn't precisely 17% on every amount — it's off by at most 1 cent.

### Refactor

- **Optional `durationInHours` parameter on `calculateDiscount`.** This avoids the duplicate calculation but couples the function signature to the caller's optimization. The function still works standalone (computes duration when omitted), so it's backwards-compatible, but the optional param is a mild API smell.
- **Renamed form fields were a breaking change.** `classification` → `classifications` and `make` → `makes` touched every file that reads form state. Since form state is entirely internal (not in URLs or persisted), this was safe — but if filter state were ever serialized to query params, a rename like this would break bookmarked URLs.
- **Intentionally skipped several medium/low refactor items** from REFACTOR.md (extracting a `FilterToggleGroup` component, shared test utilities, merging small utility files) to keep the refactor focused on clarity rather than architecture changes.
