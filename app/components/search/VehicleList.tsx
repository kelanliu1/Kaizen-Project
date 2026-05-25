import { setTimeOnDate, FormValues } from "@/components/search/form.tsx";
import { API } from "@/server/api";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { VehicleListItem } from "./VehicleListItem";

export function VehicleList() {
  const form = useFormContext<FormValues>();
  const startDate = form.watch("startDate");
  const startTime = form.watch("startTime");
  const endDate = form.watch("endDate");
  const endTime = form.watch("endTime");
  const minPassengers = form.watch("minPassengers");
  const classifications = form.watch("classifications");
  const makes = form.watch("makes");
  const price = form.watch("price");

  const startDateTime = useMemo(
    () => setTimeOnDate(startDate, startTime),
    [startDate, startTime],
  );
  const endDateTime = useMemo(
    () => setTimeOnDate(endDate, endTime),
    [endDate, endTime],
  );

  if (endDateTime <= startDateTime) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          Drop-off must be after pick-up. Please adjust your dates or times.
        </div>
      </div>
    );
  }

  const searchResponse = API.searchVehicles({
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    passengerCount: Number(minPassengers),
    classifications,
    makes,
    priceMin: price[0],
    priceMax: price[1],
  });

  if (searchResponse.vehicles.length === 0) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-muted-foreground">
          No vehicles found. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-4">
        {searchResponse.vehicles.map((vehicle) => (
          <VehicleListItem
            key={vehicle.id}
            vehicle={vehicle}
            startDateTime={startDateTime}
            endDateTime={endDateTime}
          />
        ))}
      </ul>
    </div>
  );
}
