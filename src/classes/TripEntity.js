import StopTimeUpdate from "./StopTimeUpdate.js";
import Train from "./Train.js";
import Trip from "./Trip.js";
import lines from "../data/lines.js";

export default class TripEntity {
  constructor(tripEntity, index) {
    const te = tripEntity;
    let type = "Invalid"; // Default
    let tripObject = null;
    
    if (
      te.tripUpdate
      && te.tripUpdate.trip
      && te.tripUpdate.trip.tripId
      //&& te.tripUpdate.trip.startTime // Not always present
      && te.tripUpdate.trip.startDate
      && te.tripUpdate.trip.routeId
    ) {

      if (
        te.vehicle
        && te.tripUpdate.stopTimeUpdate
        && te.tripUpdate.stopTimeUpdate[0]
        && te.tripUpdate.stopTimeUpdate[0].arrival
        && te.tripUpdate.stopTimeUpdate[0].arrival.time
        && te.tripUpdate.stopTimeUpdate[0].departure
        && te.tripUpdate.stopTimeUpdate[0].departure.time
        && te.tripUpdate.stopTimeUpdate[0].stopId 
      ) {

        if (
          te.vehicle.currentStopSequence
          //&& te.vehicle.timestamp // This is missing on some
          && te.vehicle.stopId
        ) {
          type = "Current"
          tripObject = te.tripUpdate.trip;
        } else {
          type = "Scheduled";
          tripObject = te.vehicle.trip;
        }

      } else if (te.vehicle && te.vehicle.currentStopSequence) {

        const line = lines[te.tripUpdate.trip.routeId];
        if (!line) throw "Invalid line: " + te.tripUpdate.trip.routeId;
        const currentStop = te.vehicle.currentStopSequence;
        const firstStop = line[0];
        const lastStop = line[line.length - 1];

        if (currentStop === firstStop || currentStop === lastStop) {
          type = "Arrived";
          tripObject = te.vehicle.trip;
        }

      } else {
        // 🚸 These seem to be future trips?
        //console.log("OTHER NO STU OR CSS at index:", index);
      }

    } else {
      console.log("OTHER NO TRIP at index:", index);
      console.log("\nte.tripUpdate", te.tripUpdate
        ,"\n.trip", te.tripUpdate.trip
        ,"\n.trip.tripId", te.tripUpdate.trip.tripId
        //,"\n.trip.startTime", te.tripUpdate.trip.startTime
        ,"\n.trip.startDate", te.tripUpdate.trip.startDate
        ,"\n.trip.routeId", te.tripUpdate.trip.routeId)
    }

    this.index = index;
    this.timestamp = te.timestamp;
    
    let trip = null
    if (type === "Current" || type === "Scheduled") {
      const startTime = tripObject.startTime || null;
      trip = new Trip(tripObject.tripId, startTime, tripObject.startDate, tripObject.routeId);
      console.log(trip)
    }

    this.trip = trip;
    
    if (type === "Current") {
      const CURRENT_TRIPS_START_AT_MOST_IN_FUTURE = 30;
      if (
        !trip.startTimestamp
        && (
          !trip.tripUpdate
          || !trip.tripUpdate.stopTimeUpdate
          || !trip.tripUpdate.stopTimeUpdate[0]
          || !trip.tripUpdate.stopTimeUpdate[0].arrival
          || !trip.tripUpdate.stopTimeUpdate[0].arrival.time
          || parseInt(trip.tripUpdate.stopTimeUpdate[0].arrival.time) - CURRENT_TRIPS_START_AT_MOST_IN_FUTURE > parseInt(te.timestamp)
        )
      ) {
        if (trip.tripUpdate
          && trip.tripUpdate.stopTimeUpdate) {
        console.log("⏱", parseInt(trip.tripUpdate.stopTimeUpdate[0].arrival.time) - CURRENT_TRIPS_START_AT_MOST_IN_FUTURE > parseInt(te.timestamp), parseInt(trip.tripUpdate.stopTimeUpdate[0].arrival.time) - CURRENT_TRIPS_START_AT_MOST_IN_FUTURE, parseInt(te.timestamp))
          } else { console.log("⏱", "something missing")
        console.log(trip.tripUpdate)}
        type = "noStartTime";
      } else if (trip.startTimestamp > te.timestamp) {
        type = "Future";
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

  // Creates a Train object from the data in a TrainEntity object
  createTrainOrFindTrainIn(trainsArray) {
    try {
      const trip = this.trip
  
      // Find or create Train object
      let trainObject = trainsArray.filter(i => i.id === trip.tripId)[0];
      if (!trainObject) {
        trainObject = new Train(trip.tripId, this);
      } else {
        trainObject.mostRecentTripEntity = this;
      }
  
      return trainObject;
  
    } catch(error) {
      console.log(`Error parsing train at index ${this.index} update:\n`, error)
  
      return null;
    }
  }

}