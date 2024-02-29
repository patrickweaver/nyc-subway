import { DateTime } from "luxon";
const timezone = process.env.TIMEZONE;

export function timestampFromDateAndTime(startDate, startTime) {
  const startTimestampDT = DateTime.fromObject(
    {
      year: startDate.substring(0, 4),
      month: startDate.substring(4, 6),
      day: startDate.substring(6, 8),
      hour: startTime.substring(0, 2),
      minute: startTime.substring(3, 5),
      second: startTime.substring(6, 8),
    },
    { zone: timezone }
  );

  const timestamp = new Date(startTimestampDT.toISO()).getTime() / 1000;
  return timestamp;
}
