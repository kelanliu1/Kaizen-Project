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
