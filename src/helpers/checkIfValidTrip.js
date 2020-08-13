// Check for required properties in train.tripUpdate

export default function checkIfValidTrip(index, tripUpdate) {
  try {
    if (!tripUpdate) {
      throw `index ${index} train has no "tripUpdate" property.`
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
    return { valid: true, error: false }
  } catch (error) {
    return { valid: false, error: error }
  }
}