module.exports = function mergeTripUpdateAndVehicleEntities(tripEntities) {
  try {
    const tripUpdates = [], vehicles = [], unknown = [];
    tripEntities.forEach(i => {
      if (i.tripUpdate) {
        tripUpdates.push(i);
      } else if (i.vehicle) {
        vehicles.push(i);
      } else {
        unknown.push(i);
      }
    });

    const tripUpdateIds = tripUpdates.map(i => {
      if (!i.tripUpdate.trip) throw "No trip data.";
      if (!i.tripUpdate.trip.tripId) throw "No trip id.";
      return i.tripUpdate.trip.tripId;
    });

    const vehicleIds = vehicles.map(i => {
      if (!i.vehicle.trip) throw "No trip data.";
      if (!i.vehicle.trip.tripId) throw "No trip id.";
      return i.vehicle.trip.tripId;
    });
    
    // It seems likely that the indexes for the matching
    // tripUpdate and vehicle will be the same, but this
    // will double check.
    tripUpdateIds.forEach((id, index) => {
      const tripUpdateEntity = tripUpdates[index];
      const vehicleIndex = vehicleIds.indexOf(id);
      let vehicleEntity;
      if (vehicleIndex === -1) {
        throw "Vehicle for tripUpdate not found."
      } else {
        vehicleEntity = vehicles[vehicleIndex];
      }
      tripUpdateEntity.vehicle = vehicleEntity.vehicle;
      vehicleIds.splice(vehicleIndex, 1);
      vehicles.splice(vehicleIndex, 1);
    });

    if (vehicles.length > 0) {
      throw "Unmatched vehicles remaining: " + vehicles.length;
    }

    return tripUpdates;

  } catch (error) {
    console.log("Error merging tripUpdates and vehicles:", error);
    return [];
  }
}