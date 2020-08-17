// Check for required properties in trainUpdate.tripUpdate

export default function checkIfValidTrip(index, trainUpdate) {

  const tripUpdate = trainUpdate.tripUpdate;

  try {
    if (!tripUpdate) {

      if (
        trainUpdate.vehicle
        && trainUpdate.vehicle.trip
        && trainUpdate.vehicle.trip.startTime
      ) {
        return {
          inProgress: false,
          scheduled: trainUpdate.vehicle.trip.startTime,
          error: false
        }
      }

      throw `index ${index} train has no "tripUpdate" property and no "trainUpdate.vehicle.trip.startTime" property. Vehicle: ${JSON.stringify(trainUpdate.vehicle)}`
    }
    if (!tripUpdate.trip) {
      throw `index ${index} train.tripUpdate has no "trip" property.`
    }
    if (!tripUpdate.trip.routeId) {
      throw `index ${index} train.tripUpdate.trip has no "routeId" property.`
    }
    if (!tripUpdate.stopTimeUpdate) {
      throw `index ${index} train.tripUpdate has no "stopTimeUpdate" property.`
    }
    // Only need information about the next stop
    // 🚧 Sometimes the first stop is in the recent past
    if (!tripUpdate.stopTimeUpdate[0]) {
      throw `index ${index} train.tripUpdate.stopTimeUpdate is empty or not an array.`
    }
    if (!tripUpdate.stopTimeUpdate[0].stopId) {
      throw `index ${index} train.tripUpdate.stopTimeUpdate[0] has no "stopId" property.`
    }
    return { inProgress: true, scheduled: false, error: false }
  } catch (error) {
    return { inProgress: false, scheduled: false, error: error }
  }
}