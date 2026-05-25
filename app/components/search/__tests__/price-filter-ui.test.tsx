import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
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
      <FormSpy />
    </FormProvider>
  );
}

// Renders current form price values as a data attribute for test assertions
function FormSpy() {
  const form = useFormContext<FormValues>();
  const price = form.watch("price");
  return <div data-testid="form-spy" data-price={JSON.stringify(price)} />;
}

function getFormPrice(container: HTMLElement): [number, number] {
  const spy = container.querySelector('[data-testid="form-spy"]')!;
  return JSON.parse(spy.getAttribute("data-price")!);
}

// Helper: get the price input elements scoped to a render container
function getPriceInputs(container: HTMLElement) {
  const min = container.querySelector<HTMLInputElement>('[data-price-input="min"]')!;
  const max = container.querySelector<HTMLInputElement>('[data-price-input="max"]')!;
  return { min, max };
}

// ─────────────────────────────────────────────────────────────
// PRICE INPUT DISPLAY TESTS
// ─────────────────────────────────────────────────────────────

describe("Price filter inputs display", () => {
  it("default price range shows min=10 and max with '+' suffix in inputs", () => {
    const { container } = render(<Wrapper />);
    const { min, max } = getPriceInputs(container);

    expect(min.value).toBe("10");
    expect(max.value).toBe(`${DYNAMIC_MAX}+`);
  });

  it("$100 displays as '100' (a real cap, not unlimited) in the max input", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 100]} />);
    const { max } = getPriceInputs(container);

    expect(max.value).toBe("100");
  });

  it("renders price inputs with correct values for custom range", () => {
    const { container } = render(<Wrapper defaultPrice={[20, 80]} />);
    const { min, max } = getPriceInputs(container);

    expect(min.value).toBe("20");
    expect(max.value).toBe("80");
  });

  it("shows exact value when max is below dynamic max", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 90]} />);
    const { max } = getPriceInputs(container);

    expect(max.value).toBe("90");
    expect(max.value).not.toContain("+");
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

// ─────────────────────────────────────────────────────────────
// EDITABLE PRICE INPUTS — bidirectional sync with slider
// ─────────────────────────────────────────────────────────────

describe("Editable price inputs", () => {
  it("typing in min input and blurring updates the form value", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { min } = getPriceInputs(container);

    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "50" } });
    fireEvent.blur(min);

    const price = getFormPrice(container);
    expect(price[0]).toBe(50);
    expect(price[1]).toBe(200);
  });

  it("typing in max input and blurring updates the form value", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { max } = getPriceInputs(container);

    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "150" } });
    fireEvent.blur(max);

    const price = getFormPrice(container);
    expect(price[0]).toBe(10);
    expect(price[1]).toBe(150);
  });

  it("pressing Enter in min input commits the value", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { min } = getPriceInputs(container);

    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "60" } });
    fireEvent.keyDown(min, { key: "Enter" });

    const price = getFormPrice(container);
    expect(price[0]).toBe(60);
  });

  it("pressing Enter in max input commits the value", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { max } = getPriceInputs(container);

    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "130" } });
    fireEvent.keyDown(max, { key: "Enter" });

    const price = getFormPrice(container);
    expect(price[1]).toBe(130);
  });

  it("min input value snaps to nearest step on blur", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { min } = getPriceInputs(container);

    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "37" } });
    fireEvent.blur(min);

    // 37 rounds to 40 (nearest step of 10)
    const price = getFormPrice(container);
    expect(price[0]).toBe(40);
    expect(min.value).toBe("40");
  });

  it("max input value snaps to nearest step on blur", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { max } = getPriceInputs(container);

    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "143" } });
    fireEvent.blur(max);

    // 143 rounds to 140
    const price = getFormPrice(container);
    expect(price[1]).toBe(140);
    expect(max.value).toBe("140");
  });

  it("min input is clamped to not exceed current max", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 80]} />);
    const { min } = getPriceInputs(container);

    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "150" } });
    fireEvent.blur(min);

    // Should clamp to 80 (the current max)
    const price = getFormPrice(container);
    expect(price[0]).toBe(80);
  });

  it("max input is clamped to not go below current min", () => {
    const { container } = render(<Wrapper defaultPrice={[50, 200]} />);
    const { max } = getPriceInputs(container);

    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "20" } });
    fireEvent.blur(max);

    // Should clamp to 50 (the current min)
    const price = getFormPrice(container);
    expect(price[1]).toBe(50);
  });

  it("max input is clamped to not exceed slider max", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { max } = getPriceInputs(container);

    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "999" } });
    fireEvent.blur(max);

    const price = getFormPrice(container);
    expect(price[1]).toBe(DYNAMIC_MAX);
  });

  it("min input is clamped to slider minimum", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 200]} />);
    const { min } = getPriceInputs(container);

    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "2" } });
    fireEvent.blur(min);

    const price = getFormPrice(container);
    expect(price[0]).toBe(10);
  });

  it("non-numeric min input falls back to slider minimum", () => {
    const { container } = render(<Wrapper defaultPrice={[50, 200]} />);
    const { min } = getPriceInputs(container);

    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "abc" } });
    fireEvent.blur(min);

    const price = getFormPrice(container);
    expect(price[0]).toBe(10);
  });

  it("non-numeric max input falls back to slider maximum", () => {
    const { container } = render(<Wrapper defaultPrice={[10, 100]} />);
    const { max } = getPriceInputs(container);

    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "xyz" } });
    fireEvent.blur(max);

    const price = getFormPrice(container);
    expect(price[1]).toBe(DYNAMIC_MAX);
  });

  it("max input shows raw number when focused at dynamic max", () => {
    const { container } = render(<Wrapper />);
    const { max } = getPriceInputs(container);

    // Before focus: shows "220+"
    expect(max.value).toBe(`${DYNAMIC_MAX}+`);

    // After focus: shows raw number for editing
    fireEvent.focus(max);
    expect(max.value).toBe(String(DYNAMIC_MAX));
  });

  it("slider updates are reflected in the input values", () => {
    const { container } = render(<Wrapper defaultPrice={[30, 150]} />);
    const { min, max } = getPriceInputs(container);

    expect(min.value).toBe("30");
    expect(max.value).toBe("150");
  });
});
