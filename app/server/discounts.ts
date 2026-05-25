import { DateTime } from "luxon";

export interface Discount {
  type: "holiday" | "long_rental";
  label: string;
  originalTotalCents: number;
  discountedTotalCents: number;
  savingsCents: number;
}

export const HOLIDAYS: { month: number; day: number }[] = [
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

export function isHoliday(date: DateTime): boolean {
  const month = date.month;
  const day = date.day;
  return HOLIDAYS.some((h) => h.month === month && h.day === day);
}

export function containsHoliday(start: DateTime, end: DateTime): boolean {
  if (isHoliday(start) || isHoliday(end)) {
    return false;
  }

  for (let year = start.year; year <= end.year; year++) {
    for (const h of HOLIDAYS) {
      const holidayDate = DateTime.fromObject({
        year,
        month: h.month,
        day: h.day,
      });
      if (holidayDate > start && holidayDate < end) {
        return true;
      }
    }
  }

  return false;
}

const LONG_RENTAL_DISCOUNT_CENTS_PER_HOUR = 1000; // $10/hr
const HOLIDAY_DISCOUNT_RATE = 0.17;

export function calculateDiscount(
  start: DateTime,
  end: DateTime,
  hourlyRateCents: number,
): Discount | null {
  const durationInHours = end.diff(start, "hours").hours || 0;
  const originalTotalCents = hourlyRateCents * durationInHours;

  const holidayEligible = containsHoliday(start, end);
  const longRentalEligible = durationInHours > 72;

  let holidayDiscount: Discount | null = null;
  let longRentalDiscount: Discount | null = null;

  if (holidayEligible) {
    const discountedTotal = Math.round(originalTotalCents * (1 - HOLIDAY_DISCOUNT_RATE));
    holidayDiscount = {
      type: "holiday",
      label: "Holiday Discount (17% off)",
      originalTotalCents,
      discountedTotalCents: discountedTotal,
      savingsCents: originalTotalCents - discountedTotal,
    };
  }

  if (longRentalEligible) {
    const effectiveRate = Math.max(hourlyRateCents - LONG_RENTAL_DISCOUNT_CENTS_PER_HOUR, 0);
    const discountedTotal = effectiveRate * durationInHours;
    longRentalDiscount = {
      type: "long_rental",
      label: "Long Rental ($10/hr off)",
      originalTotalCents,
      discountedTotalCents: discountedTotal,
      savingsCents: originalTotalCents - discountedTotal,
    };
  }

  if (holidayDiscount && longRentalDiscount) {
    // Pick the one with the lower total; tie goes to holiday
    return holidayDiscount.discountedTotalCents <= longRentalDiscount.discountedTotalCents
      ? holidayDiscount
      : longRentalDiscount;
  }

  return holidayDiscount ?? longRentalDiscount ?? null;
}
