import { DateTime } from "luxon";
import {
  Reservation,
  RESERVATIONS,
  RESERVATIONS_BY_VEHICLE_ID,
  Vehicle,
  VEHICLES,
} from "./data";

export const getVehicleById = (id: string): Vehicle | undefined => {
  return VEHICLES.find((vehicle) => vehicle.id === id);
};

export const getReservationById = (id: string): Reservation | undefined => {
  return RESERVATIONS.find((reservation) => reservation.id === id);
};

export const getAvailableVehicles = ({
  startTime,
  endTime,
  passengerCount,
  classifications,
  makes,
  priceMinDollars,
  priceMaxDollars,
}: {
  startTime: DateTime;
  endTime: DateTime;
  passengerCount: number;
  classifications: string[];
  makes: string[];
  priceMinDollars: number;
  priceMaxDollars: number;
}) => {
  return VEHICLES.filter((vehicle) => {
    const reservations = RESERVATIONS_BY_VEHICLE_ID[vehicle.id] ?? [];

    const isAvailableWithinTimeRange = reservations.every((reservation) => {
      return (
        reservation.start_time > endTime || reservation.end_time < startTime
      );
    });

    const matchesPrice =
      vehicle.hourly_rate_cents >= priceMinDollars * 100 &&
      vehicle.hourly_rate_cents <= priceMaxDollars * 100;

    const matchesClassification = classifications.includes(vehicle.classification);

    const matchesMake = makes.includes(vehicle.make);

    const matchesPassengerCount = vehicle.max_passengers >= passengerCount;

    return (
      isAvailableWithinTimeRange &&
      matchesPrice &&
      matchesClassification &&
      matchesMake &&
      matchesPassengerCount
    );
  });
};

export const getVehicles = () => {
  return VEHICLES;
};
