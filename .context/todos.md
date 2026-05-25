# TODOs

## Part 1: Price Filter Bug
- [ ] Raise slider max to cover full price range (see `.context/BUG.md`)
- [ ] Update "unlimited" sentinel logic in `api.ts` to use new max
- [ ] Update display label in `AdditionalFilters.tsx`
- [ ] Update default form values in `SearchPage.tsx`
- [ ] Consider making max dynamic via `API.getFilterOptions()`

## Part 2: Discount System
- [ ] Create `app/server/discounts.ts` with holiday data and discount logic
- [ ] Add `PriceQuote` type with discount info
- [ ] Update `API.getQuote` to return discount-aware quotes
- [ ] Update `VehicleListItem.tsx` to show discounted prices in search results
- [ ] Update `ReviewPage.tsx` to show discount breakdown in checkout
- [ ] Handle edge cases (zero-rate floor, year boundaries, exact 72hr boundary)
