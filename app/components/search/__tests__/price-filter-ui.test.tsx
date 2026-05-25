import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { AdditionalFilters } from "../AdditionalFilters";
import { API } from "@/server/api";
import type { FormValues } from "../form";
import { VEHICLES } from "@/server/data";

const filterOptions = API.getFilterOptions();

// Wrapper that provides react-hook-form context to AdditionalFilters
function Wrapper({
  defaultPrice = [10, 100] as [number, number],
}: {
  defaultPrice?: [number, number];
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      startDate: new Date(),
      startTime: "10:00",
      endDate: new Date(),
      endTime: "11:00",
      minPassengers: 1,
      classification: filterOptions.classifications,
      make: filterOptions.makes,
      price: defaultPrice,
    },
  });

  return (
    <FormProvider {...form}>
      <AdditionalFilters filterOptions={filterOptions} />
    </FormProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// DISPLAY LABEL TESTS — "$100+" sentinel in the UI
// ─────────────────────────────────────────────────────────────

describe("Price filter label display", () => {
  it("FAILS: default price range should NOT show '$100+' (misleading unlimited)", () => {
    render(<Wrapper />);

    // The default [10, 100] displays "$100+" — implying "no cap".
    // This is the root of the user confusion: there IS no way to say "exactly $100".
    // After the fix, the label at max should say something like "$220+" or "$250+"
    // and $100 should display as "$100" (a real cap).
    const matches = screen.queryAllByText(/\$100\+/);
    expect(matches).toHaveLength(0);
  });

  it("renders the price label with min and max values", () => {
    render(<Wrapper defaultPrice={[20, 80]} />);

    expect(screen.getAllByText(/\$20/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$80/).length).toBeGreaterThan(0);
  });

  it("shows '$100+' when slider is at max (100)", () => {
    render(<Wrapper defaultPrice={[10, 100]} />);

    // This documents current behavior: $100 renders as "$100+"
    expect(screen.getAllByText(/\$100\+/).length).toBeGreaterThan(0);
  });

  it("shows exact dollar amount when slider is below max", () => {
    render(<Wrapper defaultPrice={[10, 90]} />);

    // $90 renders as "$90" (not "$90+")
    expect(screen.getAllByText(/\$90/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/\$90\+/)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// SLIDER CONSTRAINT TESTS — The slider physically prevents
// users from expressing values above $100
// ─────────────────────────────────────────────────────────────

describe("Price slider constraints", () => {
  it("FAILS: slider max should be high enough to cover the $220/hr C-Class", () => {
    render(<Wrapper />);

    // Radix renders multiple sliders (price range + passengers).
    // The price RangeSlider has two thumbs; find them via aria-valuemax=100.
    const allSliders = screen.getAllByRole("slider");
    const priceSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemax") === "100",
    );

    // The max thumb of the price slider
    const maxThumb = priceSliders[priceSliders.length - 1];
    const ariaMax = Number(maxThumb.getAttribute("aria-valuemax"));

    // The most expensive vehicle is $220/hr. The slider max should accommodate it.
    expect(ariaMax).toBeGreaterThanOrEqual(220);
  });

  it("renders price slider thumbs with aria-valuemin=10", () => {
    render(<Wrapper />);
    const allSliders = screen.getAllByRole("slider");
    const priceSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemin") === "10",
    );
    expect(priceSliders.length).toBeGreaterThan(0);
    expect(priceSliders[0].getAttribute("aria-valuemin")).toBe("10");
  });

  it("renders price slider max thumb with aria-valuemax=100 (current buggy state)", () => {
    render(<Wrapper />);
    const allSliders = screen.getAllByRole("slider");
    const priceMaxSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemax") === "100",
    );
    // Documents current state: max is 100
    expect(priceMaxSliders.length).toBeGreaterThan(0);
  });

  it("renders default values [10, 100] on the price slider thumbs", () => {
    render(<Wrapper />);
    const allSliders = screen.getAllByRole("slider");
    const priceSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemax") === "100",
    );

    const values = priceSliders.map((el) =>
      Number(el.getAttribute("aria-valuenow")),
    );
    expect(values).toContain(10);
    expect(values).toContain(100);
  });
});

// ─────────────────────────────────────────────────────────────
// FORM DEFAULT STATE — Validates the initial filter config
// ─────────────────────────────────────────────────────────────

describe("Default form state", () => {
  it("FAILS: default max price should cover all vehicles, not be unlimited sentinel", () => {
    const FORM_DEFAULT_PRICE_MAX = 100;
    const MAX_VEHICLE_RATE_DOLLARS =
      Math.max(...VEHICLES.map((v) => v.hourly_rate_cents)) / 100;

    // The form default max should be >= the highest vehicle rate.
    // Currently 100 < 220, so this fails.
    expect(FORM_DEFAULT_PRICE_MAX).toBeGreaterThanOrEqual(
      MAX_VEHICLE_RATE_DOLLARS,
    );
  });

  it("renders all classification toggles", () => {
    render(<Wrapper />);

    for (const classification of filterOptions.classifications) {
      // Radix ToggleGroup may render text in multiple spans; use queryAll
      const matches = screen.queryAllByText(classification);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it("renders all make toggles", () => {
    render(<Wrapper />);

    for (const make of filterOptions.makes) {
      const matches = screen.queryAllByText(make);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it("renders the Filters heading", () => {
    render(<Wrapper />);
    const headings = screen.queryAllByText("Filters");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders the Reset all button", () => {
    render(<Wrapper />);
    // Use queryAll since Radix may duplicate button internals
    const buttons = screen.getAllByRole("button").filter(
      (el) => el.textContent?.trim() === "Reset all",
    );
    expect(buttons.length).toBeGreaterThan(0);
  });
});
