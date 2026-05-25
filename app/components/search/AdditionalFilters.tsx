"use client";

import { FormValues } from "@/components/search/form.tsx";
import { Button } from "@/components/shared/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shared/ui/form";
import { Input } from "@/components/shared/ui/input";
import { RangeSlider, Slider } from "@/components/shared/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/shared/ui/toggle-group";
import { formatDollars } from "@/lib/formatters.tsx";
import { FilterOptions } from "@/server/api";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

function PassengerField() {
  const form = useFormContext<FormValues>();
  const passengers = form.watch("minPassengers");
  const [passengerInput, setPassengerInput] = useState(String(passengers));
  const [passengerFocused, setPassengerFocused] = useState(false);

  if (String(passengers) !== passengerInput && !passengerFocused) {
    setPassengerInput(String(passengers));
  }

  const commitPassengerInput = (raw: string) => {
    let val = parseInt(raw, 10);
    if (isNaN(val)) val = 1;
    val = Math.max(1, Math.min(val, 10));
    setPassengerInput(String(val));
    form.setValue("minPassengers", val);
  };

  return (
    <FormField
      control={form.control}
      name="minPassengers"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <div className="flex w-full items-baseline justify-between mb-4">
            <FormLabel>Passengers</FormLabel>
            <Input
              data-passenger-input
              type="text"
              inputMode="numeric"
              className="w-12 h-7 text-sm text-center p-0"
              value={passengerInput}
              onChange={(e) => setPassengerInput(e.target.value)}
              onFocus={() => setPassengerFocused(true)}
              onBlur={(e) => { setPassengerFocused(false); commitPassengerInput(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") commitPassengerInput(passengerInput); }}
            />
          </div>
          <FormControl>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[field.value]}
              onValueChange={(value) => field.onChange(value[0])}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AdditionalFilters({ filterOptions }: { filterOptions: FilterOptions }) {
  const form = useFormContext<FormValues>();

  const price = form.watch("price");
  const minPrice = price[0];
  const maxPrice = price[1];

  const SLIDER_MIN = 10;
  const SLIDER_MAX = filterOptions.maxPrice;
  const STEP = 10;

  const [minInput, setMinInput] = useState(String(minPrice));
  const [maxInput, setMaxInput] = useState(String(maxPrice));
  const [minFocused, setMinFocused] = useState(false);
  const [maxFocused, setMaxFocused] = useState(false);

  // Sync local input state when slider changes (only when input is not focused)
  if (String(minPrice) !== minInput && !minFocused) {
    setMinInput(String(minPrice));
  }
  if (String(maxPrice) !== maxInput && !maxFocused) {
    setMaxInput(String(maxPrice));
  }

  const commitPriceInput = (raw: string, bound: "min" | "max") => {
    const fallback = bound === "min" ? SLIDER_MIN : SLIDER_MAX;
    let val = parseInt(raw, 10);
    if (isNaN(val)) val = fallback;
    val = Math.round(val / STEP) * STEP;
    if (bound === "min") {
      val = Math.max(SLIDER_MIN, Math.min(val, maxPrice));
      setMinInput(String(val));
      form.setValue("price", [val, maxPrice]);
    } else {
      val = Math.max(minPrice, Math.min(val, SLIDER_MAX));
      setMaxInput(String(val));
      form.setValue("price", [minPrice, val]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-xl font-semibold">Filters</h3>
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Price</FormLabel>
            <div className="flex items-center gap-2 mb-1">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  data-price-input="min"
                  type="text"
                  inputMode="numeric"
                  className="pl-6 h-8 text-sm"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  onFocus={() => setMinFocused(true)}
                  onBlur={(e) => { setMinFocused(false); commitPriceInput(e.target.value, "min"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") commitPriceInput(minInput, "min"); }}
                />
              </div>
              <span className="text-sm text-muted-foreground">to</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  data-price-input="max"
                  type="text"
                  inputMode="numeric"
                  className="pl-6 h-8 text-sm"
                  value={maxFocused ? maxInput : (maxPrice >= SLIDER_MAX ? `${SLIDER_MAX}+` : maxInput)}
                  onChange={(e) => setMaxInput(e.target.value.replace(/\+$/, ""))}
                  onFocus={() => { setMaxFocused(true); setMaxInput(String(maxPrice)); }}
                  onBlur={(e) => { setMaxFocused(false); commitPriceInput(e.target.value.replace(/\+$/, ""), "max"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") commitPriceInput(maxInput, "max"); }}
                />
              </div>
            </div>
            <FormControl>
              <RangeSlider
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={STEP}
                value={field.value}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <PassengerField />
      <FormField
        control={form.control}
        name="classifications"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex items-baseline justify-between">
              <FormLabel>Class</FormLabel>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                data-clear="classifications"
                onClick={() => form.setValue("classifications", [])}
              >
                Clear all
              </Button>
            </div>
            <FormControl>
              <ToggleGroup
                type="multiple"
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-wrap justify-start"
              >
                {filterOptions.classifications.map((classification) => (
                  <FormItem key={classification}>
                    <FormControl>
                      <ToggleGroupItem variant="outline" value={classification}>
                        {classification}
                      </ToggleGroupItem>
                    </FormControl>
                  </FormItem>
                ))}
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="makes"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex items-baseline justify-between">
              <FormLabel>Make</FormLabel>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                data-clear="makes"
                onClick={() => form.setValue("makes", [])}
              >
                Clear all
              </Button>
            </div>
            <FormControl>
              <ToggleGroup
                type="multiple"
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-wrap justify-start"
              >
                { filterOptions.makes.map((make) => (
                  <FormItem key={make}>
                    <FormControl>
                      <ToggleGroupItem variant="outline" value={make}>
                        {make}
                      </ToggleGroupItem>
                    </FormControl>
                  </FormItem>
                ))}
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          form.reset();
        }}
        className="mt-4"
        disabled={
          form.getValues().minPassengers === 1 &&
          form.getValues().makes === undefined &&
          form.getValues().price[0] === 10 &&
          form.getValues().price[1] === filterOptions.maxPrice
        }
      >
        Reset all
      </Button>
    </div>
  );
}
