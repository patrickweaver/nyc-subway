import Train from '../classes/Train.js';

import findTrainPosition from "./findTrainPosition.js";

export default function parseCurrentTrips(tripEntity, trainsArray) {

  try {
    const trip = tripEntity.trip

    // Find train object if it already exists
    let newTrain = false;
    let trainObject = trainsArray.filter(i => i.id === trip.tripId)[0];
    // Locate train:
    // 🚸 Something different if this is negative
    const nextStopUpdate = tripEntity.stopTimeUpdates[0]
    const nextStopId = nextStopUpdate.GtfsStopId;
    const routeId = trip.routeId;
    const direction = trip.direction
    let waitTimeEstimate
    if (nextStopUpdate.arrival) {
      waitTimeEstimate = nextStopUpdate.arrival - tripEntity.timestamp;
    } else {
      // 🚸 Not sure if this will ever happen, but if this is an already mapped train
      // set wait time to 0
      if (trainObject) {
        waitTimeEstimate = 0
      } else {
        // 🚸 Don't draw trains not already on map with no arrival
        //waitTimeEstimate = 0
        throw "No arrival time set"
      }
    }
    // All trains are either N or S (uptown/downtown)
    if (!(direction === 'N' || direction === 'S')) {
      throw 'Invalid train direction: ' + direction;
    }

    const trainPos = findTrainPosition(nextStopId, routeId, direction, waitTimeEstimate);

    // If train is new add to trains array:
    if (!trainObject) {
      newTrain = true;
      trainObject = new Train(trip.tripId, trainPos.lat, trainPos.long, direction)
    } else {
      if (trainObject.latitude != trainPos.lat || trainObject.longitude != trainPos.long) {
        trainObject.latitude = trainPos.lat;
        trainObject.longitude = trainPos.long;
        trainObject.move = true;
      }
    }

    return { trainObject: trainObject, newTrain: newTrain }

  } catch(error) {
    console.log(`Error parsing train at index ${tripEntity.index} update:\n`, error)

    return { trainObject: null, newTrain: null }
  }
}