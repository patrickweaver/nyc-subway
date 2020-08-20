import { DateTime } from "luxon";
const timezone = TIMEZONE;

export default class TripEntity {
  constructor(tripEntity, index, timestamp = null) {
    const te = tripEntity;
    let valid = false;
    let type = "Invalid"; // Default
    let tripObject = null;
    
    if (
      te.tripUpdate
      && te.tripUpdate.trip
      && te.tripUpdate.trip.tripId
      && te.tripUpdate.trip.startTime
      && te.tripUpdate.trip.startDate
      && te.tripUpdate.trip.routeId
      && te.tripUpdate.stopTimeUpdate
      && te.tripUpdate.stopTimeUpdate[0]
      && te.tripUpdate.stopTimeUpdate[0].arrival
      && te.tripUpdate.stopTimeUpdate[0].arrival.time
      && te.tripUpdate.stopTimeUpdate[0].departure
      && te.tripUpdate.stopTimeUpdate[0].departure.time
      && te.tripUpdate.stopTimeUpdate[0].stopId
    ) {
      type = "Current" // May change to future
      tripObject = te.tripUpdate.trip;
    } else if (
      te.vehicle
      && te.vehicle.trip
      && te.vehicle.trip.tripId
      && te.vehicle.trip.startTime
      && te.vehicle.trip.startDate
      && te.vehicle.trip.routeId
      && te.vehicle.currentStopSequence
      //&& te.vehicle.timestamp // This is missing on some
      && te.vehicle.stopId
    ) {
      type = "Scheduled";
      tripObject = te.vehicle.trip;
    } else {
      console.log("OTHER at index:", index)
      // Not on a current trip or scheduled.
    }

    this.index = index;
    this.timestamp = timestamp;
    
    let trip = null
    if (type === "Current" || type === "Scheduled") {
      trip = new Trip(tripObject.tripId, tripObject.startTime, tripObject.startDate, tripObject.routeId);
    }

    this.trip = trip;
    
    if (type === "Current") {
      if (trip.startTimestamp > timestamp) {
        type = "Future"
      }

      this.stopTimeUpdates = te.tripUpdate.stopTimeUpdate.map((i, index) => new StopTimeUpdate(index, i))
    } else {
      this.stopTimeUpdates = null;
    }

    if (type === "Scheduled") {
      this.vehicleCurrentStopSequence = te.vehicle.currentStopSequence;
      this.vehicleTimestamp = te.vehicle.timestamp;
      this.vehicleStopId = te.vehicle.stopId;
    } else {
      this.vehicleCurrentStopSequence = null;
      this.vehicleTimestamp = null;
      this.vehicleStopId = null;
    }

    this.type = type;
    
  };

}

class Trip {
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
    this.startTimestamp = (new Date(startTimestampDT.toISO())).getTime() / 1000;
  }
}

class StopTimeUpdate {
  constructor(index, stu) {
    this.index = index;
    this.arrival = stu.arrival.time;
    this.departure = stu.departure.time;
    this.stopId = stu.stopId // Contains direction

    this.GtfsStopId = stu.stopId.substring(0, stu.stopId.length - 1) // Direction removed
    this.direction = stu.stopId.substring(stu.stopId.length - 1, stu.stopId.length);
  }
}
