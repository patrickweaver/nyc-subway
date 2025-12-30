import type { TrainDirection } from "../types";
import LocalTime from "./LocalTime";

export default class Trip {
  tripId: string;
  startTime: string | null;
  startDate: string;
  routeId: string;
  direction: TrainDirection | null;
  startTimestamp: number | null;

  constructor(
    tripId: string,
    startTime: string | null,
    startDate: string,
    routeId: string
  ) {
    this.tripId = tripId;
    this.startTime = startTime;
    this.startDate = startDate;
    this.routeId = routeId;

    this.direction = (() => {
      const idSplit = this.tripId.split("..");
      if (idSplit[1] && idSplit[1][0]) {
        // 🍄 Type Assertion
        return idSplit[1][0] as TrainDirection;
      }
      return null;
    })();

    // Second precision Unix timestamp
    this.startTimestamp = this.startTime
      ? LocalTime.fromYYMMDD_HHMMSS(
          startDate,
          startTime ?? ""
        ).secondPrecisionTS()
      : null;
  }
}
