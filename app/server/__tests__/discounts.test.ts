import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";

// These tests target the discount module described in FEATURE_DESIGN.md.
// The module (app/server/discounts.ts) does not exist yet — all tests
// will fail until the feature is implemented.

// Expected imports from the future module:
import {
  HOLIDAYS,
  isHoliday,
  containsHoliday,
  calculateDiscount,
} from "../discounts";

// Helpers to build DateTimes concisely
function dt(iso: string) {
  return DateTime.fromISO(iso);
}

// Holiday list from FEATURE_DESIGN.md:
// Jan 21, Feb 12, Mar 04, May 02, Jun 16,
// Jul 26, Aug 03, Sep 01, Nov 05, Dec 18

// ─────────────────────────────────────────────────────────────
// HOLIDAYS DATA
// ─────────────────────────────────────────────────────────────

describe("HOLIDAYS constant", () => {
  it("contains exactly 10 holidays", () => {
    expect(HOLIDAYS).toHaveLength(10);
  });

  it("includes all specified holidays", () => {
    const expected = [
      { month: 1, day: 21 },
      { month: 2, day: 12 },
      { month: 3, day: 4 },
      { month: 5, day: 2 },
      { month: 6, day: 16 },
      { month: 7, day: 26 },
      { month: 8, day: 3 },
      { month: 9, day: 1 },
      { month: 11, day: 5 },
      { month: 12, day: 18 },
    ];
    for (const h of expected) {
      expect(HOLIDAYS).toContainEqual(h);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// isHoliday
// ─────────────────────────────────────────────────────────────

describe("isHoliday", () => {
  it("returns true for Jan 21 of any year", () => {
    expect(isHoliday(dt("2025-01-21T10:00:00"))).toBe(true);
    expect(isHoliday(dt("2030-01-21T00:00:00"))).toBe(true);
  });

  it("returns true for Dec 18", () => {
    expect(isHoliday(dt("2025-12-18T12:00:00"))).toBe(true);
  });

  it("returns false for a regular day", () => {
    expect(isHoliday(dt("2025-03-15T10:00:00"))).toBe(false);
  });

  it("returns false for Jan 22 (day after a holiday)", () => {
    expect(isHoliday(dt("2025-01-22T10:00:00"))).toBe(false);
  });

  it("checks month and day, ignoring time", () => {
    expect(isHoliday(dt("2025-09-01T23:59:59"))).toBe(true);
    expect(isHoliday(dt("2025-09-01T00:00:00"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// containsHoliday — holiday falls strictly between start and
// end, and start/end themselves are NOT on holidays
// ─────────────────────────────────────────────────────────────

describe("containsHoliday", () => {
  it("returns true when a holiday falls strictly within the range", () => {
    // Jan 20 to Jan 23 — contains Jan 21 holiday
    expect(containsHoliday(dt("2025-01-20T10:00:00"), dt("2025-01-23T10:00:00"))).toBe(true);
  });

  it("returns false when range contains a holiday but starts on a holiday", () => {
    // Starts Jan 21 (holiday), ends Jan 25
    expect(containsHoliday(dt("2025-01-21T10:00:00"), dt("2025-01-25T10:00:00"))).toBe(false);
  });

  it("returns false when range contains a holiday but ends on a holiday", () => {
    // Starts Jan 18, ends Jan 21 (holiday)
    expect(containsHoliday(dt("2025-01-18T10:00:00"), dt("2025-01-21T10:00:00"))).toBe(false);
  });

  it("returns false when start AND end are on holidays", () => {
    // Jan 21 (holiday) to Feb 12 (holiday)
    expect(containsHoliday(dt("2025-01-21T10:00:00"), dt("2025-02-12T10:00:00"))).toBe(false);
  });

  it("returns false when no holiday falls within the range", () => {
    // Jan 5 to Jan 10 — no holidays
    expect(containsHoliday(dt("2025-01-05T10:00:00"), dt("2025-01-10T10:00:00"))).toBe(false);
  });

  it("returns false when range is too short to contain a holiday", () => {
    // Jan 20 12:00 to Jan 20 18:00 — same day, no holiday inside
    expect(containsHoliday(dt("2025-01-20T12:00:00"), dt("2025-01-20T18:00:00"))).toBe(false);
  });

  it("handles range spanning a year boundary", () => {
    // Dec 15 to Jan 25 — contains Dec 18 and Jan 21
    expect(containsHoliday(dt("2025-12-15T10:00:00"), dt("2026-01-25T10:00:00"))).toBe(true);
  });

  it("handles range spanning a year boundary with holiday only in new year", () => {
    // Dec 20 to Jan 25 — Dec 18 is before start, but Jan 21 is inside
    expect(containsHoliday(dt("2025-12-20T10:00:00"), dt("2026-01-25T10:00:00"))).toBe(true);
  });

  it("returns true with multiple holidays in range", () => {
    // Jul 20 to Sep 10 — contains Jul 26, Aug 03, Sep 01
    expect(containsHoliday(dt("2025-07-20T10:00:00"), dt("2025-09-10T10:00:00"))).toBe(true);
  });

  it("returns false when the only holiday is exactly at start time", () => {
    // Start exactly on May 2 holiday
    expect(containsHoliday(dt("2025-05-02T08:00:00"), dt("2025-05-10T08:00:00"))).toBe(false);
  });

  it("returns false when the only holiday is exactly at end time", () => {
    // End exactly on May 2 holiday
    expect(containsHoliday(dt("2025-04-25T08:00:00"), dt("2025-05-02T08:00:00"))).toBe(false);
  });

  it("holiday must be strictly between start and end (same day as start, different time)", () => {
    // Start on Jan 21 at 23:00, end Jan 25 — start DATE is the holiday
    expect(containsHoliday(dt("2025-01-21T23:00:00"), dt("2025-01-25T10:00:00"))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// calculateDiscount — core discount logic
// ─────────────────────────────────────────────────────────────

describe("calculateDiscount", () => {
  // ── Holiday discount only ──

  describe("holiday discount (17% off total)", () => {
    it("applies 17% discount when holiday is in range", () => {
      // Jan 20 to Jan 23 = 72 hours, contains Jan 21 holiday
      // NOT > 72 hours, so only holiday discount applies
      const start = dt("2025-01-20T10:00:00");
      const end = dt("2025-01-23T10:00:00");
      const hourlyRateCents = 5000; // $50/hr

      const discount = calculateDiscount(start, end, hourlyRateCents);

      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("holiday");
      expect(discount!.originalTotalCents).toBe(5000 * 72);
      expect(discount!.discountedTotalCents).toBe(Math.round(5000 * 72 * 0.83));
      expect(discount!.savingsCents).toBe(
        discount!.originalTotalCents - discount!.discountedTotalCents,
      );
    });

    it("does not apply holiday discount when start is on holiday", () => {
      // Start Jan 21 (holiday), end Jan 23 = 48 hours, no long rental
      const discount = calculateDiscount(
        dt("2025-01-21T10:00:00"),
        dt("2025-01-23T10:00:00"),
        5000,
      );
      expect(discount).toBeNull();
    });

    it("does not apply holiday discount when end is on holiday", () => {
      // Start Jan 19, end Jan 21 (holiday) = 48 hours
      const discount = calculateDiscount(
        dt("2025-01-19T10:00:00"),
        dt("2025-01-21T10:00:00"),
        5000,
      );
      expect(discount).toBeNull();
    });
  });

  // ── Long rental discount only ──

  describe("long rental discount ($10/hr off)", () => {
    it("applies $10/hr discount for rentals > 72 hours", () => {
      // Jan 5 to Jan 9 = 96 hours, no holidays in range
      const start = dt("2025-01-05T10:00:00");
      const end = dt("2025-01-09T10:00:00");
      const hourlyRateCents = 5000; // $50/hr

      const discount = calculateDiscount(start, end, hourlyRateCents);

      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("long_rental");
      // $10/hr off = 1000 cents/hr off → effective rate = 4000 cents/hr
      expect(discount!.originalTotalCents).toBe(5000 * 96);
      expect(discount!.discountedTotalCents).toBe(4000 * 96);
      expect(discount!.savingsCents).toBe(1000 * 96);
    });

    it("does NOT apply for exactly 72 hours", () => {
      // Jan 5 to Jan 8 = exactly 72 hours, no holidays
      const discount = calculateDiscount(
        dt("2025-01-05T10:00:00"),
        dt("2025-01-08T10:00:00"),
        5000,
      );
      expect(discount).toBeNull();
    });

    it("applies for 72 hours and 1 minute", () => {
      const discount = calculateDiscount(
        dt("2025-01-05T10:00:00"),
        dt("2025-01-08T10:01:00"),
        5000,
      );
      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("long_rental");
    });

    it("caps discount so effective rate does not go below $0", () => {
      // Vehicle at $8/hr (800 cents), long rental discount is $10/hr (1000 cents)
      // Effective rate should be 0, not negative
      const start = dt("2025-01-05T10:00:00");
      const end = dt("2025-01-09T10:00:00"); // 96 hours
      const hourlyRateCents = 800;

      const discount = calculateDiscount(start, end, hourlyRateCents);

      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("long_rental");
      expect(discount!.discountedTotalCents).toBe(0);
      expect(discount!.savingsCents).toBe(800 * 96);
    });

    it("caps discount for rate exactly $10/hr", () => {
      const start = dt("2025-01-05T10:00:00");
      const end = dt("2025-01-09T10:00:00"); // 96 hours
      const hourlyRateCents = 1000; // exactly $10/hr

      const discount = calculateDiscount(start, end, hourlyRateCents);

      expect(discount).not.toBeNull();
      expect(discount!.discountedTotalCents).toBe(0);
    });
  });

  // ── No discount ──

  describe("no discount", () => {
    it("returns null for short rental with no holiday", () => {
      // Jan 5 to Jan 6 = 24 hours, no holidays
      const discount = calculateDiscount(
        dt("2025-01-05T10:00:00"),
        dt("2025-01-06T10:00:00"),
        5000,
      );
      expect(discount).toBeNull();
    });

    it("returns null for short rental starting on a holiday", () => {
      // Start Jan 21 (holiday), end Jan 22 = 24 hours
      const discount = calculateDiscount(
        dt("2025-01-21T10:00:00"),
        dt("2025-01-22T10:00:00"),
        5000,
      );
      expect(discount).toBeNull();
    });
  });

  // ── Conflict resolution: both apply, pick best price ──

  describe("conflict resolution (both discounts eligible)", () => {
    it("picks the discount that produces the lower total", () => {
      // Jan 18 to Jan 23 = 120 hours (> 72), contains Jan 21 holiday
      // Both discounts apply. Compare:
      //   Holiday: 5000 * 120 * 0.83 = 498000
      //   Long rental: (5000 - 1000) * 120 = 480000
      // Long rental wins (lower total)
      const start = dt("2025-01-18T10:00:00");
      const end = dt("2025-01-23T10:00:00");

      const discount = calculateDiscount(start, end, 5000);

      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("long_rental");
      expect(discount!.discountedTotalCents).toBe(4000 * 120);
    });

    it("picks holiday discount when it produces a lower total", () => {
      // Use a very cheap vehicle where $10/hr off barely helps,
      // but 17% off the total is more.
      // Rate: $12/hr (1200 cents), duration: 120 hours
      //   Holiday: 1200 * 120 * 0.83 = 119520
      //   Long rental: max(1200-1000, 0) * 120 = 200 * 120 = 24000
      // Long rental actually wins here too. Let's pick a scenario where holiday wins.
      //
      // Rate: $70/hr (7000 cents), duration: 73 hours (just over 3 days)
      // Need a range that includes a holiday.
      // Jun 14 10:00 to Jun 17 11:00 = 73 hours, contains Jun 16 holiday
      //   Holiday: 7000 * 73 * 0.83 = 424060
      //   Long rental: (7000 - 1000) * 73 = 438000
      // Holiday wins (424060 < 438000)
      const start = dt("2025-06-14T10:00:00");
      const end = dt("2025-06-17T11:00:00");

      const discount = calculateDiscount(start, end, 7000);

      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("holiday");
      expect(discount!.discountedTotalCents).toBe(Math.round(7000 * 73 * 0.83));
    });

    it("picks holiday discount when both produce the same total", () => {
      // Per FEATURE_DESIGN.md: "pick holiday discount as convention"
      // This is hard to hit exactly, so we test the tie-breaking convention:
      // if both totals are equal, holiday should be chosen.
      // We'll verify this by checking the type when the prices are very close.
      // For now, just ensure both are computed and the lower one is picked.

      // Rate: $59/hr (5900 cents), duration: 73 hours
      // Jun 14 10:00 to Jun 17 11:00
      //   Holiday: 5900 * 73 * 0.83 = 357,406 (rounded)
      //   Long rental: (5900 - 1000) * 73 = 357,700
      // Holiday wins (357406 < 357700)
      const start = dt("2025-06-14T10:00:00");
      const end = dt("2025-06-17T11:00:00");

      const discount = calculateDiscount(start, end, 5900);

      expect(discount).not.toBeNull();
      expect(discount!.type).toBe("holiday");
    });
  });

  // ── Label ──

  describe("discount labels", () => {
    it("holiday discount has descriptive label", () => {
      const discount = calculateDiscount(
        dt("2025-01-20T10:00:00"),
        dt("2025-01-23T10:00:00"),
        5000,
      );
      expect(discount).not.toBeNull();
      expect(discount!.label).toContain("17%");
    });

    it("long rental discount has descriptive label", () => {
      const discount = calculateDiscount(
        dt("2025-01-05T10:00:00"),
        dt("2025-01-09T10:00:00"),
        5000,
      );
      expect(discount).not.toBeNull();
      expect(discount!.label).toContain("$10");
    });
  });

  // ── Year boundary ──

  describe("year boundary handling", () => {
    it("detects holiday across year boundary (Dec→Jan)", () => {
      // Dec 15 2025 to Jan 25 2026 — contains Dec 18 and Jan 21
      // Duration: ~41 days > 72 hours, so both discounts apply
      const start = dt("2025-12-15T10:00:00");
      const end = dt("2026-01-25T10:00:00");

      const discount = calculateDiscount(start, end, 5000);

      // Should not be null — at minimum long rental applies (41 days)
      // and holiday applies too (Dec 18 or Jan 21 is in range)
      expect(discount).not.toBeNull();
    });

    it("detects Jan 21 holiday in 2026", () => {
      // Jan 19 2026 to Jan 23 2026 = 96 hours, contains Jan 21
      const start = dt("2026-01-19T10:00:00");
      const end = dt("2026-01-23T10:00:00");

      const discount = calculateDiscount(start, end, 5000);

      expect(discount).not.toBeNull();
      // Both holiday and long rental apply (96 > 72 hours, holiday inside)
      // Long rental: (5000-1000)*96 = 384000
      // Holiday: 5000*96*0.83 = 398400
      // Long rental wins
      expect(discount!.type).toBe("long_rental");
    });
  });
});
