import Train from '../classes/Train.js';

import findTrainPosition from "./findTrainPosition.js";

export default function parseCurrentTrips(tripEntity, trainsArray) {

  try {
    const trip = tripEntity.trip
    // Locate train:
    // 🚸 Something different if this is negative
    const nextStopUpdate = tripEntity.stopTimeUpdates[0]
    const nextStopId = nextStopUpdate.GtfsStopId;
    const routeId = trip.routeId;
    const direction = trip.direction
    const waitTimeEstimate = nextStopUpdate.arrival.time - tripEntity.timestamp;
    // All trains are either N or S (uptown/downtown)
    if (!(direction === 'N' || direction === 'S')) {
      throw 'Invalid train direction: ' + direction;
    }

    const trainPos = findTrainPosition(nextStopId, routeId, direction, waitTimeEstimate);

    
    // Find or create train object
    let newTrain = false;
    let trainObject = trainsArray.filter(i => i.id === trip.tripId)[0];

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