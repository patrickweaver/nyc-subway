import { DateTime } from "luxon";
const timezone = TIMEZONE;

export default class Trip {
  constructor(tripId, startTime, startDate, routeId) {
    this.tripId = tripId;
    this.startTime = startTime;
    this.startDate = startDate;
    this.routeId = routeId;

    this.direction = this.tripId.split("..")[1] ? this.tripId.split("..")[1] : null;
    
    const startTimestampDT = DateTime.fromObject({
      year: startDate.substring(0, 4),
      month: startDate.substring(4, 6),
      day: startDate.substring(6, 8),
      hour: startTime.substring(0, 2),
      minute: startTime.substring(3, 5),
      second: startTime.substring(6, 8),
      zone: timezone
    })
    const stts = (new Date(startTimestampDT.toISO())).getTime() / 1000;
    console.log(timezone, startDate, startTime, "⌛️ 1.", stts, "2.", startTimestampDT, "3.", startTimestampDT.toISO(), "4.", new Date(startTimestampDT.ts), "5.", (new Date(startTimestampDT.ts)).getTime())
    this.startTimestamp = (new Date(startTimestampDT.toISO())).getTime() / 1000;
  }
}