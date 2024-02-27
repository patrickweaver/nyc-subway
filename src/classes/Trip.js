import LocalTime from "./LocalTime.js";

export default class Trip {
  constructor(tripId, startTime, startDate, routeId) {
    this.tripId = tripId;
    this.startTime = startTime;
    this.startDate = startDate;
    this.routeId = routeId;

    this.direction = (() => {
      const idSplit = this.tripId.split("..");
      if (idSplit[1] && idSplit[1][0]) {
        return idSplit[1][0];
      }
      return null;
    })();

    // Second precision Unix timestamp
    this.startTimestamp = this.startTime
      ? LocalTime.fromYYMMDD_HHMMSS(startDate, startTime).secondPrecisionTS()
      : null;
  }
}
