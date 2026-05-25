import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { getAvailableVehicles } from "../data_helpers";
import { API } from "../api";
import { VEHICLES } from "../data";

// Use a far-future time range so no reservations overlap
const FAR_START = DateTime.fromISO("2099-01-01T00:00:00");
const FAR_END = DateTime.fromISO("2099-01-02T00:00:00");

const ALL_CLASSIFICATIONS = [
  "Compact",
  "SUV",
  "Sports",
  "Subcompact",
  "Minivan",
  "Luxury",
];
const ALL_MAKES = [
  ...new Set(VEHICLES.map((v) => v.make)),
];

// Helper: search with only price constraints (everything else permissive)
function searchByPrice(priceMin: number, priceMax: number) {
  return API.searchVehicles({
    startTime: FAR_START.toISO()!,
    endTime: FAR_END.toISO()!,
    passengerCount: 1,
    classifications: ALL_CLASSIFICATIONS,
    makes: ALL_MAKES,
    priceMin,
    priceMax,
  });
}

function getByPrice(priceMinDollars: number, priceMaxDollars: number) {
  return getAvailableVehicles({
    startTime: FAR_START,
    endTime: FAR_END,
    passengerCount: 1,
    classifications: ALL_CLASSIFICATIONS,
    makes: ALL_MAKES,
    priceMinDollars,
    priceMaxDollars,
  });
}

// ─────────────────────────────────────────────────────────────
// USER COMPLAINT TESTS — These FAIL against the current code,
// proving the bug described in .context/BUG.md
// ─────────────────────────────────────────────────────────────

describe("User complaint: 'I want to hide results above $125/hr'", () => {
  it("should exclude vehicles above $125/hr when max is set to 125", () => {
    // The slider cannot represent $125 — its max is $100.
    // Even if we could pass 125 to the API layer, the slider prevents it.
    // This test passes 125 directly to getAvailableVehicles to show
    // the data layer CAN filter correctly — the bug is in the UI constraint.
    const results = getByPrice(10, 125);
    const rates = results.map((v) => v.hourly_rate_cents);

    // All results should be ≤ $125/hr (12500 cents)
    expect(rates.every((r) => r <= 12500)).toBe(true);

    // Specifically, Mustang ($160), X5 ($170), C-Class ($220) must be excluded
    const names = results.map((v) => `${v.make} ${v.model}`);
    expect(names).not.toContain("Ford Mustang");
    expect(names).not.toContain("BMW X5");
    expect(names).not.toContain("Mercedes-Benz C-Class");
  });

  it("FAILS: slider max of 100 means the user cannot set a $125 cap via the UI", () => {
    const SLIDER_MAX = 100;

    // The closest the user can get is priceMax = 100 (the slider's max),
    // but that triggers the "unlimited" sentinel in searchVehicles.
    const result = searchByPrice(10, SLIDER_MAX);
    const names = result.vehicles.map((v) => `${v.make} ${v.model}`);

    // User expects: no vehicles above $125/hr
    // Bug: priceMax=100 → unlimited, so expensive vehicles appear
    expect(names).not.toContain("Ford Mustang"); // $160/hr
    expect(names).not.toContain("BMW X5"); // $170/hr
    expect(names).not.toContain("Mercedes-Benz C-Class"); // $220/hr
  });
});

describe("User complaint: 'MY BUDGET IS $100 PER HOUR BUT IT'S SHOWING ME VERY EXPENSIVE CARS'", () => {
  it("FAILS: setting priceMax to $100 should only show vehicles ≤ $100/hr", () => {
    const result = searchByPrice(10, 100);
    const rates = result.vehicles.map((v) => v.hourly_rate_cents);

    // User expects: only vehicles at or below $100/hr (10000 cents)
    expect(rates.every((r) => r <= 10000)).toBe(true);
  });

  it("FAILS: setting priceMax to $100 should not include the $220/hr Mercedes", () => {
    const result = searchByPrice(10, 100);
    const names = result.vehicles.map((v) => `${v.make} ${v.model}`);

    expect(names).not.toContain("Mercedes-Benz C-Class");
  });

  it("FAILS: setting priceMax to $100 should not include the $160/hr Mustang", () => {
    const result = searchByPrice(10, 100);
    const names = result.vehicles.map((v) => `${v.make} ${v.model}`);

    expect(names).not.toContain("Ford Mustang");
  });

  it("FAILS: setting priceMax to $100 should not include the $170/hr BMW X5", () => {
    const result = searchByPrice(10, 100);
    const names = result.vehicles.map((v) => `${v.make} ${v.model}`);

    expect(names).not.toContain("BMW X5");
  });
});

// ─────────────────────────────────────────────────────────────
// SENTINEL / UNLIMITED LOGIC — Documents the buggy behavior
// ─────────────────────────────────────────────────────────────

describe("searchVehicles sentinel: priceMax === 100 treated as unlimited", () => {
  it("priceMax=100 returns vehicles above $100/hr (bug: unlimited)", () => {
    const result = searchByPrice(10, 100);
    const maxRate = Math.max(
      ...result.vehicles.map((v) => v.hourly_rate_cents),
    );

    // This PASSES — documenting the bug. The max rate returned is $220.
    expect(maxRate).toBeGreaterThan(10000);
  });

  it("priceMax=90 correctly caps results at $90/hr", () => {
    const result = searchByPrice(10, 90);
    const rates = result.vehicles.map((v) => v.hourly_rate_cents);

    expect(rates.every((r) => r <= 9000)).toBe(true);
    expect(rates.length).toBeGreaterThan(0);
  });

  it("priceMax=99 correctly caps results (no unlimited trigger)", () => {
    const result = searchByPrice(10, 99);
    const rates = result.vehicles.map((v) => v.hourly_rate_cents);

    // $99 → 9900 cents. Should exclude Mustang/X5/C-Class and also Wrangler ($85)
    expect(rates.every((r) => r <= 9900)).toBe(true);
  });

  it("priceMax=101 correctly caps results (no unlimited trigger)", () => {
    // Values above 100 but not equal to 100 work fine
    const result = searchByPrice(10, 101);
    const rates = result.vehicles.map((v) => v.hourly_rate_cents);

    expect(rates.every((r) => r <= 10100)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// DATA LAYER: getAvailableVehicles price filtering
// ─────────────────────────────────────────────────────────────

describe("getAvailableVehicles: price filtering (data layer)", () => {
  it("filters to only the cheapest vehicle at narrow range", () => {
    const results = getByPrice(30, 35);
    // Only Spark at $32/hr should match
    expect(results).toHaveLength(1);
    expect(results[0].model).toBe("Spark");
  });

  it("includes vehicles at exact lower boundary", () => {
    // Spark is exactly $32/hr (3200 cents); min=$32 should include it
    const results = getByPrice(32, 50);
    const names = results.map((v) => v.model);
    expect(names).toContain("Spark");
  });

  it("includes vehicles at exact upper boundary", () => {
    // Corolla is exactly $45/hr (4500 cents); max=$45 should include it
    const results = getByPrice(10, 45);
    const names = results.map((v) => v.model);
    expect(names).toContain("Corolla");
  });

  it("excludes vehicles just above the upper boundary", () => {
    // max=$44 should exclude Corolla at $45/hr
    const results = getByPrice(10, 44);
    const names = results.map((v) => v.model);
    expect(names).not.toContain("Corolla");
  });

  it("excludes vehicles just below the lower boundary", () => {
    // min=$33 should exclude Spark at $32/hr
    const results = getByPrice(33, 100);
    const names = results.map((v) => v.model);
    expect(names).not.toContain("Spark");
  });

  it("returns empty when min > max", () => {
    const results = getByPrice(100, 10);
    expect(results).toHaveLength(0);
  });

  it("returns empty when range matches no vehicles", () => {
    const results = getByPrice(100, 150);
    // No vehicle has rate between $100-$150/hr (gap between $85 Wrangler and $160 Mustang)
    expect(results).toHaveLength(0);
  });

  it("returns single vehicle when min equals max at exact rate", () => {
    const results = getByPrice(32, 32);
    expect(results).toHaveLength(1);
    expect(results[0].model).toBe("Spark");
  });

  it("returns all vehicles with wide-enough range", () => {
    const results = getByPrice(0, 300);
    expect(results.length).toBe(VEHICLES.length);
  });

  it("correctly filters the mid-range ($50-$90)", () => {
    const results = getByPrice(50, 90);
    const names = results.map((v) => v.model);

    // Should include: Rogue ($58), Golf ($56), Santa Fe ($72), CX-9 ($70),
    //                 Pacifica ($80), Wrangler ($85)
    expect(names).toContain("Rogue");
    expect(names).toContain("Golf");
    expect(names).toContain("Santa Fe");
    expect(names).toContain("CX-9");
    expect(names).toContain("Pacifica");
    expect(names).toContain("Wrangler");

    // Should exclude: Spark ($32), Civic ($42), Corolla ($45),
    //                 Mustang ($160), X5 ($170), C-Class ($220)
    expect(names).not.toContain("Spark");
    expect(names).not.toContain("Civic");
    expect(names).not.toContain("Corolla");
    expect(names).not.toContain("Mustang");
    expect(names).not.toContain("X5");
    expect(names).not.toContain("C-Class");
  });
});

// ─────────────────────────────────────────────────────────────
// SLIDER RANGE COVERAGE — Validates the slider's range is
// insufficient for the actual vehicle catalog
// ─────────────────────────────────────────────────────────────

describe("Slider range vs vehicle catalog", () => {
  const SLIDER_MIN = 10;
  const SLIDER_MAX = 100;
  const SLIDER_STEP = 10;

  it("FAILS: slider max should cover the most expensive vehicle", () => {
    const maxRateDollars = Math.max(
      ...VEHICLES.map((v) => v.hourly_rate_cents),
    ) / 100;

    // Most expensive vehicle is $220/hr. Slider max must be ≥ $220.
    expect(SLIDER_MAX).toBeGreaterThanOrEqual(maxRateDollars);
  });

  it("all possible slider positions are valid steps", () => {
    const positions: number[] = [];
    for (let v = SLIDER_MIN; v <= SLIDER_MAX; v += SLIDER_STEP) {
      positions.push(v);
    }
    // 10, 20, 30, ..., 100 → 10 positions
    expect(positions).toHaveLength(10);
    expect(positions[0]).toBe(10);
    expect(positions[positions.length - 1]).toBe(100);
  });

  it("vehicles above $100/hr are unreachable by slider", () => {
    const unreachable = VEHICLES.filter(
      (v) => v.hourly_rate_cents > SLIDER_MAX * 100,
    );
    // 3 vehicles are above $100/hr — Mustang, X5, C-Class
    expect(unreachable).toHaveLength(3);
    expect(unreachable.map((v) => v.model).sort()).toEqual([
      "C-Class",
      "Mustang",
      "X5",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────
// API.searchVehicles — other edge cases
// ─────────────────────────────────────────────────────────────

describe("API.searchVehicles: edge cases", () => {
  it("returns empty array for invalid date range (end before start)", () => {
    const result = API.searchVehicles({
      startTime: FAR_END.toISO()!,
      endTime: FAR_START.toISO()!,
      passengerCount: 1,
      classifications: ALL_CLASSIFICATIONS,
      makes: ALL_MAKES,
      priceMin: 10,
      priceMax: 100,
    });
    expect(result.vehicles).toHaveLength(0);
  });

  it("filters by passenger count correctly", () => {
    // Only vehicles with ≥ 7 passengers: Santa Fe (7), CX-9 (7), Pacifica (8)
    const result = API.searchVehicles({
      startTime: FAR_START.toISO()!,
      endTime: FAR_END.toISO()!,
      passengerCount: 7,
      classifications: ALL_CLASSIFICATIONS,
      makes: ALL_MAKES,
      priceMin: 10,
      priceMax: 100,
    });
    const names = result.vehicles.map((v) => v.model);
    expect(names).toContain("Santa Fe");
    expect(names).toContain("CX-9");
    expect(names).toContain("Pacifica");
    // Exclude 5-passenger vehicles
    expect(names).not.toContain("Corolla");
    expect(names).not.toContain("Golf");
  });

  it("filters by classification correctly", () => {
    const result = API.searchVehicles({
      startTime: FAR_START.toISO()!,
      endTime: FAR_END.toISO()!,
      passengerCount: 1,
      classifications: ["Sports"],
      makes: ALL_MAKES,
      priceMin: 10,
      priceMax: 100, // unlimited due to bug
    });
    // Only Mustang is Sports class
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].model).toBe("Mustang");
  });

  it("filters by make correctly", () => {
    const result = API.searchVehicles({
      startTime: FAR_START.toISO()!,
      endTime: FAR_END.toISO()!,
      passengerCount: 1,
      classifications: ALL_CLASSIFICATIONS,
      makes: ["Toyota"],
      priceMin: 10,
      priceMax: 100, // unlimited due to bug
    });
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].model).toBe("Corolla");
  });
});

// ─────────────────────────────────────────────────────────────
// API.getFilterOptions
// ─────────────────────────────────────────────────────────────

describe("API.getFilterOptions", () => {
  it("FAILS: should include a max price that covers all vehicles", () => {
    const options = API.getFilterOptions();
    // getFilterOptions currently returns makes, classifications, passengerCounts
    // but NOT a price max — the slider is hardcoded. This test asserts that
    // the API SHOULD provide a maxPrice so the slider can be dynamic.
    expect(options).toHaveProperty("maxPrice");
  });

  it("returns all unique makes sorted", () => {
    const options = API.getFilterOptions();
    expect(options.makes).toEqual([
      "BMW",
      "Chevrolet",
      "Chrysler",
      "Ford",
      "Honda",
      "Hyundai",
      "Jeep",
      "Mazda",
      "Mercedes-Benz",
      "Nissan",
      "Toyota",
      "Volkswagen",
    ]);
  });

  it("returns all unique classifications sorted", () => {
    const options = API.getFilterOptions();
    expect(options.classifications).toEqual([
      "Compact",
      "Luxury",
      "Minivan",
      "SUV",
      "Sports",
      "Subcompact",
    ]);
  });

  it("returns all unique passenger counts sorted", () => {
    const options = API.getFilterOptions();
    expect(options.passengerCounts).toEqual([4, 5, 7, 8]);
  });
});
