export default class TripEntity {
  constructor(tripEntity, timestamp = null) {
    const te = tripEntity;
    let type = "Invalid" // Default
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
      type = "Current"
      tripObject = te.tripUpdate.trip;
    } else if (
      te.vehicle
      && te.vehicle.trip
      && te.vehicle.trip.tripId
      && te.vehicle.trip.startTime
      && te.vehicle.trip.startDate
      && te.vehicle.trip.routeId
      && te.vehicle.currentStopSequence
      && te.vehicle.timestamp
      && te.vehicle.stopId
    ) {
      type = "Scheduled";
      tripObject = te.vehicle.trip;
    } else {
      /*
      console.log("📌\n", te)
      console.log(".tripUpdate", te.tripUpdate)
      if (te.tripUpdate) {
        console.log(".trip", te.tripUpdate.trip)
        if (te.tripUpdate.trip) {
          console.log(".tripId", te.tripUpdate.trip.tripId)
          console.log(".startTime", te.tripUpdate.trip.startTime)
          console.log(".startDate", te.tripUpdate.trip.startDate)
          console.log(".routeId", te.tripUpdate.trip.routeId)
        }
      }
      console.log(".stopTimeUpdate", te.tripUpdate.stopTimeUpdate)
      if (te.tripUpdate.stopTimeUpdate) {
        console.log("[0]", te.tripUpdate.stopTimeUpdate[0])
        if (te.tripUpdate.stopTimeUpdate[0]) {
          console.log(".arrival", te.tripUpdate.stopTimeUpdate[0].arrival)
          if (te.tripUpdate.stopTimeUpdate[0].arrival) {
            console.log(".time", te.tripUpdate.stopTimeUpdate[0].arrival.time)
          }
          console.log(".departure", te.tripUpdate.stopTimeUpdate[0].departure)
          if (te.tripUpdate.stopTimeUpdate[0].departure) {
            console.log(".time", te.tripUpdate.stopTimeUpdate[0].departure.time)
          }
          console.log(".stopId", te.tripUpdate.stopTimeUpdate[0].stopId)
        }
      }
      */
    }

    this.timestamp = timestamp;
    this.type = type;
    if (type === "Current" || type === "Scheduled") {
      this.trip = new Trip(tripObject.tripId, tripObject.startTime, tripObject.startDate, tripObject.routeId)
    } else {
      this.trip = null;
    }
    
    if (type === "Current") {
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
    
  };

}

class Trip {
  constructor(tripId, startTime, startDate, routeId) {
    this.tripId = tripId;
    this.startTime = startTime;
    this.startDate = startDate;
    this.routeId = routeId;

    this.direction = this.tripId.split("..")[1] ? this.tripId.split("..")[1] : null;
  }
}

class StopTimeUpdate {
  constructor(index, stu) {
    this.index = index;
    this.arrival = stu.arrival.time;
    this.departure = stu.departure.time;
    this.stopId = stu.stopId

    this.GtfsStopId = stu.stopId.substring(0, stu.stopId.length - 1)
    this.direction = stu.stopId.substring(stu.stopId.length - 1, stu.stopId.length);
  }
}
