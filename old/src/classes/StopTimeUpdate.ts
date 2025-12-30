import type { StopTimeUpdateData, TrainDirection } from "../types";

export default class StopTimeUpdate {
  index: number;
  arrival: string | null;
  departure: string | null;
  stopId: string;
  GtfsStopId: string;
  direction: TrainDirection;

  constructor(index: number, stu: StopTimeUpdateData) {
    this.index = index;
    this.arrival = stu.arrival ? stu.arrival.time || null : null;
    this.departure = stu.departure ? stu.departure.time || null : null;
    this.stopId = stu.stopId; // Contains direction

    this.GtfsStopId = stu.stopId.substring(0, stu.stopId.length - 1); // Direction removed
    // 🍄 Type Assertion
    this.direction = stu.stopId.substring(
      stu.stopId.length - 1,
      stu.stopId.length
    ) as TrainDirection;
  }
}
