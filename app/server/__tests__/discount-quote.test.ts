import { describe, it, expect } from "vitest";
import { API } from "../api";
import { VEHICLES } from "../data";

// These tests validate that API.getQuote returns discount-enriched
// PriceQuote objects as specified in FEATURE_DESIGN.md.
// All tests will fail until the feature is implemented.

// Vehicle reference:
// id=1 Toyota Corolla  $45/hr (4500 cents)
// id=4 Chevy Spark     $32/hr (3200 cents) — cheap, tests $0 floor
// id=3 Ford Mustang    $160/hr (16000 cents) — expensive

// ─────────────────────────────────────────────────────────────
// PriceQuote shape
// ─────────────────────────────────────────────────────────────

describe("API.getQuote: PriceQuote with discount", () => {
  it("returns a discount field in the quote", () => {
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-06T10:00:00",
    });
    // Even when no discount applies, the field should exist (as null)
    expect(quote).toHaveProperty("discount");
  });

  it("discount is null when no discount applies", () => {
    // 24 hours, no holiday → no discount
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-06T10:00:00",
    });
    expect(quote.discount).toBeNull();
    expect(quote.totalPriceCents).toBe(4500 * 24);
  });
});

// ─────────────────────────────────────────────────────────────
// Holiday discount via getQuote
// ─────────────────────────────────────────────────────────────

describe("API.getQuote: holiday discount", () => {
  it("applies 17% holiday discount for Corolla rental spanning Jan 21", () => {
    // Jan 20 10:00 to Jan 23 10:00 = 72 hours, contains Jan 21
    const quote = API.getQuote({
      vehicleId: "1", // Corolla $45/hr
      startTime: "2025-01-20T10:00:00",
      endTime: "2025-01-23T10:00:00",
    });

    expect(quote.discount).not.toBeNull();
    expect(quote.discount!.type).toBe("holiday");

    const originalTotal = 4500 * 72;
    const discountedTotal = Math.round(originalTotal * 0.83);
    expect(quote.discount!.originalTotalCents).toBe(originalTotal);
    expect(quote.discount!.discountedTotalCents).toBe(discountedTotal);
    expect(quote.totalPriceCents).toBe(discountedTotal);
  });

  it("does not apply holiday discount when starting on holiday", () => {
    // Jan 21 to Jan 23 = 48 hours, starts on holiday
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-21T10:00:00",
      endTime: "2025-01-23T10:00:00",
    });
    expect(quote.discount).toBeNull();
    expect(quote.totalPriceCents).toBe(4500 * 48);
  });
});

// ─────────────────────────────────────────────────────────────
// Long rental discount via getQuote
// ─────────────────────────────────────────────────────────────

describe("API.getQuote: long rental discount", () => {
  it("applies $10/hr off for Corolla rental > 3 days", () => {
    // Jan 5 to Jan 9 = 96 hours, no holidays
    const quote = API.getQuote({
      vehicleId: "1", // Corolla $45/hr
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-09T10:00:00",
    });

    expect(quote.discount).not.toBeNull();
    expect(quote.discount!.type).toBe("long_rental");

    const originalTotal = 4500 * 96;
    const discountedTotal = 3500 * 96; // $35/hr after $10 off
    expect(quote.discount!.originalTotalCents).toBe(originalTotal);
    expect(quote.discount!.discountedTotalCents).toBe(discountedTotal);
    expect(quote.totalPriceCents).toBe(discountedTotal);
  });

  it("does not apply for exactly 72 hours", () => {
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-08T10:00:00",
    });
    expect(quote.discount).toBeNull();
    expect(quote.totalPriceCents).toBe(4500 * 72);
  });

  it("caps long rental discount so total does not go negative (Spark $32/hr)", () => {
    // Spark is $32/hr, discount is $10/hr → effective $22/hr. Not negative.
    // But test for a scenario with very cheap vehicle later if added.
    const quote = API.getQuote({
      vehicleId: "4", // Spark $32/hr
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-09T10:00:00", // 96 hours
    });

    expect(quote.discount).not.toBeNull();
    expect(quote.discount!.type).toBe("long_rental");
    // Effective rate = max(3200 - 1000, 0) = 2200 cents/hr
    expect(quote.discount!.discountedTotalCents).toBe(2200 * 96);
    expect(quote.totalPriceCents).toBe(2200 * 96);
  });
});

// ─────────────────────────────────────────────────────────────
// Conflict resolution via getQuote
// ─────────────────────────────────────────────────────────────

describe("API.getQuote: conflict resolution", () => {
  it("picks the better discount when both apply (Mustang, long range over holiday)", () => {
    // Jan 18 to Jan 23 = 120 hours > 72, contains Jan 21 holiday
    // Mustang $160/hr (16000 cents)
    //   Holiday: 16000 * 120 * 0.83 = 1,593,600
    //   Long rental: (16000 - 1000) * 120 = 1,800,000
    // Holiday discount wins (lower total)
    const quote = API.getQuote({
      vehicleId: "3", // Mustang $160/hr
      startTime: "2025-01-18T10:00:00",
      endTime: "2025-01-23T10:00:00",
    });

    expect(quote.discount).not.toBeNull();
    expect(quote.discount!.type).toBe("holiday");
    expect(quote.totalPriceCents).toBe(Math.round(16000 * 120 * 0.83));
  });

  it("picks long rental when it is cheaper (Corolla, 120 hours over holiday)", () => {
    // Jan 18 to Jan 23 = 120 hours > 72, contains Jan 21 holiday
    // Corolla $45/hr (4500 cents)
    //   Holiday: 4500 * 120 * 0.83 = 448,200
    //   Long rental: (4500 - 1000) * 120 = 420,000
    // Long rental wins
    const quote = API.getQuote({
      vehicleId: "1", // Corolla $45/hr
      startTime: "2025-01-18T10:00:00",
      endTime: "2025-01-23T10:00:00",
    });

    expect(quote.discount).not.toBeNull();
    expect(quote.discount!.type).toBe("long_rental");
    expect(quote.totalPriceCents).toBe(3500 * 120);
  });
});

// ─────────────────────────────────────────────────────────────
// Quote structure consistency
// ─────────────────────────────────────────────────────────────

describe("API.getQuote: structure", () => {
  it("always returns hourlyRateCents and durationInHours", () => {
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-06T10:00:00",
    });
    expect(quote.hourlyRateCents).toBe(4500);
    expect(quote.durationInHours).toBe(24);
  });

  it("totalPriceCents equals discountedTotalCents when discount applies", () => {
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-09T10:00:00", // long rental
    });
    expect(quote.discount).not.toBeNull();
    expect(quote.totalPriceCents).toBe(quote.discount!.discountedTotalCents);
  });

  it("totalPriceCents equals hourlyRate * hours when no discount", () => {
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-06T10:00:00",
    });
    expect(quote.totalPriceCents).toBe(quote.hourlyRateCents * quote.durationInHours);
  });

  it("discount.savingsCents = originalTotal - discountedTotal", () => {
    const quote = API.getQuote({
      vehicleId: "1",
      startTime: "2025-01-05T10:00:00",
      endTime: "2025-01-09T10:00:00",
    });
    expect(quote.discount).not.toBeNull();
    expect(quote.discount!.savingsCents).toBe(
      quote.discount!.originalTotalCents - quote.discount!.discountedTotalCents,
    );
  });
});
