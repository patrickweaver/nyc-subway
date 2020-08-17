import Train from '../classes/Train.js';

import findTrainPosition from "./findTrainPosition.js";

export default function parseCurrentTrips(tripEntity, index, trainsArray) {

  try {
    const trip = tripEntity.trip
    // Locate train:
    const nextStopId = tripEntity.stopTimeUpdates[0].GtfsStopId;
    const routeId = trip.routeId;
    const direction = trip.direction
    // All trains are either N or S (uptown/downtown)
    if (!(direction === 'N' || direction === 'S')) {
      throw 'Invalid train direction: ' + direction;
    }

    const trainPos = findTrainPosition(nextStopId, routeId, direction)

    
    // Find or create train object
    let newTrain = false;
    let trainObject = trainsArray.filter(i => i.id === trip.tripId)[0];

    // If train is new add to trains array:
    if (!trainObject) {
      newTrain = true;
      trainObject = new Train(trip.tripId, trainPos.lat, trainPos.long, direction)
    }

    return { trainObject: trainObject, newTrain: newTrain }

  } catch(error) {
    console.log("Error parsing train update:\n", error)

    return { trainObject: null, newTrain: null }
  }
}