export interface FormValues {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
  price: [number, number];
  minPassengers: number;
  makes: string[];
  classifications: string[];
}

export const setTimeOnDate = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":");
  const combinedDate = new Date(date);
  combinedDate.setHours(parseInt(hours), parseInt(minutes));
  return combinedDate;
};
