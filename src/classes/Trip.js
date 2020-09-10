import LocalTime from "./LocalTime.js";

export default class Trip {
  constructor(tripId, startTime, startDate, routeId) {
    this.tripId = tripId;
    this.startTime = startTime;
    this.startDate = startDate;
    this.routeId = routeId;

    this.direction = this.tripId.split("..")[1] ? this.tripId.split("..")[1] : null;

    // Second precision Unix timestamp
    this.startTimestamp = this.startTime ? LocalTime
      .fromYYMMDD_HHMMSS(startDate, startTime)
      .secondPrecisionTS()
      : null;
  }
}