import StopTimeUpdate from "./StopTimeUpdate.js";
import Train from "./Train.js";
import Trip from "./Trip.js"
import findTrainPosition from "../helpers/findTrainPosition.js";

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

  createTrainFrom(trainsArray) {
    try {
      const trip = this.trip
  
      // Find train object if it already exists
      let newTrain = false;
      let trainObject = trainsArray.filter(i => i.id === trip.tripId)[0];
      // Locate train:
      // 🚸 Something different if this is negative
      let nextStopUpdate = this.stopTimeUpdates[0];
      let arrivalEstimate = nextStopUpdate.arrival;
  
      if (!arrivalEstimate) {
        // 🚸 Not sure if this will ever happen, but if this is an already mapped train
        // set wait time to 0
        if (trainObject) {
          arrivalEstimate = this.timestamp;
        } else {
          // 🚸 Don't draw trains not already on map with no arrival
          //waitTimeEstimate = 0
          throw "No arrival time set"
        }
      }
  
      if (arrivalEstimate < this.timestamp) {
        if (this.stopTimeUpdates.length > 1) {
          nextStopUpdate = this.stopTimeUpdates[1];
          arrivalEstimate = nextStopUpdate.arrival;
        } else {
          arrivalEstimate = this.timestamp;
        }
      }
  
      const nextStopId = nextStopUpdate.GtfsStopId;
      const routeId = trip.routeId;
      const direction = trip.direction;
      const waitTimeEstimate = nextStopUpdate.arrival - this.timestamp;
  
      // All trains are either N or S (uptown/downtown)
      if (!(direction === 'N' || direction === 'S')) {
        throw 'Invalid train direction: ' + direction;
      }
  
      const trainPos = findTrainPosition(nextStopId, routeId, direction, waitTimeEstimate);
  
      // If train is new add to trains array:
      if (!trainObject) {
        newTrain = true;
        trainObject = new Train(trip.tripId, trainPos.lat, trainPos.long, direction);
      } else {
        if (trainObject.latitude != trainPos.lat || trainObject.longitude != trainPos.long) {
          trainObject.latitude = trainPos.lat;
          trainObject.longitude = trainPos.long;
          trainObject.move = true;
        }
      }
  
      return trainObject;
  
    } catch(error) {
      console.log(`Error parsing train at index ${this.index} update:\n`, error)
  
      return null;
    }
  }

}