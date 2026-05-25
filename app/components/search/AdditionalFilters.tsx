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

  const commitMinInput = (raw: string) => {
    let val = parseInt(raw, 10);
    if (isNaN(val)) val = SLIDER_MIN;
    val = Math.round(val / STEP) * STEP;
    val = Math.max(SLIDER_MIN, Math.min(val, maxPrice));
    setMinInput(String(val));
    form.setValue("price", [val, maxPrice]);
  };

  const commitMaxInput = (raw: string) => {
    let val = parseInt(raw, 10);
    if (isNaN(val)) val = SLIDER_MAX;
    val = Math.round(val / STEP) * STEP;
    val = Math.max(minPrice, Math.min(val, SLIDER_MAX));
    setMaxInput(String(val));
    form.setValue("price", [minPrice, val]);
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
                  onBlur={(e) => { setMinFocused(false); commitMinInput(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") commitMinInput(minInput); }}
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
                  onBlur={(e) => { setMaxFocused(false); commitMaxInput(e.target.value.replace(/\+$/, "")); }}
                  onKeyDown={(e) => { if (e.key === "Enter") commitMaxInput(maxInput); }}
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
      <FormField
        control={form.control}
        name="minPassengers"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex w-full items-baseline justify-between mb-4">
              <FormLabel>Passengers</FormLabel>
              <div className="text-sm">{field.value}</div>
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
      <FormField
        control={form.control}
        name="classification"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Class</FormLabel>
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
        name="make"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Make</FormLabel>
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
          form.getValues().make === undefined &&
          form.getValues().price[0] === 10 &&
          form.getValues().price[1] === filterOptions.maxPrice
        }
      >
        Reset all
      </Button>
    </div>
  );
}
