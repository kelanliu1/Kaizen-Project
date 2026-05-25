import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { AdditionalFilters } from "../AdditionalFilters";
import { API } from "@/server/api";
import type { FormValues } from "../form";
import { VEHICLES } from "@/server/data";

const filterOptions = API.getFilterOptions();
const DYNAMIC_MAX = filterOptions.maxPrice;

// Wrapper that provides react-hook-form context to AdditionalFilters
function Wrapper({
  defaultPrice = [10, DYNAMIC_MAX] as [number, number],
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
// DISPLAY LABEL TESTS
// ─────────────────────────────────────────────────────────────

describe("Price filter label display", () => {
  it("default price range shows dynamic max with '+' suffix", () => {
    render(<Wrapper />);

    // At the dynamic max, the label shows "${max}+"
    const maxLabel = `$${DYNAMIC_MAX}+`;
    const matches = screen.queryAllByText(new RegExp(`\\$${DYNAMIC_MAX}\\+`));
    expect(matches.length).toBeGreaterThan(0);
  });

  it("$100 now displays as '$100' (a real cap, not unlimited)", () => {
    render(<Wrapper defaultPrice={[10, 100]} />);

    // $100 should render as "$100" — no "+" suffix
    expect(screen.getAllByText(/\$100/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/\$100\+/)).toHaveLength(0);
  });

  it("renders the price label with min and max values", () => {
    render(<Wrapper defaultPrice={[20, 80]} />);

    expect(screen.getAllByText(/\$20/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$80/).length).toBeGreaterThan(0);
  });

  it("shows exact dollar amount when slider is below max", () => {
    render(<Wrapper defaultPrice={[10, 90]} />);

    expect(screen.getAllByText(/\$90/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/\$90\+/)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// SLIDER CONSTRAINT TESTS
// ─────────────────────────────────────────────────────────────

describe("Price slider constraints", () => {
  it("slider max covers the $220/hr C-Class", () => {
    render(<Wrapper />);

    const allSliders = screen.getAllByRole("slider");
    const priceSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemax") === String(DYNAMIC_MAX),
    );

    const maxThumb = priceSliders[priceSliders.length - 1];
    const ariaMax = Number(maxThumb.getAttribute("aria-valuemax"));

    expect(ariaMax).toBeGreaterThanOrEqual(220);
  });

  it("renders price slider thumbs with aria-valuemin=10", () => {
    render(<Wrapper />);
    const allSliders = screen.getAllByRole("slider");
    const priceSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemin") === "10",
    );
    expect(priceSliders.length).toBeGreaterThan(0);
  });

  it("renders price slider max thumb with dynamic aria-valuemax", () => {
    render(<Wrapper />);
    const allSliders = screen.getAllByRole("slider");
    const priceMaxSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemax") === String(DYNAMIC_MAX),
    );
    expect(priceMaxSliders.length).toBeGreaterThan(0);
  });

  it("renders default values [10, dynamic max] on the price slider thumbs", () => {
    render(<Wrapper />);
    const allSliders = screen.getAllByRole("slider");
    const priceSliders = allSliders.filter(
      (el) => el.getAttribute("aria-valuemax") === String(DYNAMIC_MAX),
    );

    const values = priceSliders.map((el) =>
      Number(el.getAttribute("aria-valuenow")),
    );
    expect(values).toContain(10);
    expect(values).toContain(DYNAMIC_MAX);
  });
});

// ─────────────────────────────────────────────────────────────
// FORM DEFAULT STATE
// ─────────────────────────────────────────────────────────────

describe("Default form state", () => {
  it("default max price covers all vehicles", () => {
    const maxRateDollars =
      Math.max(...VEHICLES.map((v) => v.hourly_rate_cents)) / 100;

    expect(DYNAMIC_MAX).toBeGreaterThanOrEqual(maxRateDollars);
  });

  it("renders all classification toggles", () => {
    render(<Wrapper />);

    for (const classification of filterOptions.classifications) {
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
    const buttons = screen.getAllByRole("button").filter(
      (el) => el.textContent?.trim() === "Reset all",
    );
    expect(buttons.length).toBeGreaterThan(0);
  });
});
