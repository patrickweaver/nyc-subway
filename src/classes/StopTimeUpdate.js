export default class StopTimeUpdate {
  constructor(index, stu) {
    this.index = index;
    this.arrival = stu.arrival ? stu.arrival.time || null : null;
    this.departure = stu.departure ? stu.departure.time || null : null;
    this.stopId = stu.stopId; // Contains direction

    this.GtfsStopId = stu.stopId.substring(0, stu.stopId.length - 1); // Direction removed
    this.direction = stu.stopId.substring(
      stu.stopId.length - 1,
      stu.stopId.length,
    );
  }
}
