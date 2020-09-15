export default function mergeTripUpdateAndVehicleEntities(tripEntities) {
  //console.log(JSON.stringify(tripEntities));
  try {
    const tripUpdates = [], vehicles = [], alerts = [], unknown = [];
    tripEntities.forEach(i => {
      if (i.tripUpdate) {
        tripUpdates.push(i);
      } else if (i.vehicle) {
        vehicles.push(i);
      } else if (i.alert) {
        alerts.push(i)
      } else {
        unknown.push(i);
      }
    });

    console.log("🧤", tripUpdates.length, vehicles.length, unknown.length)

    if (unknown.length > 0) {
      console.log("🚨 🚨 🚨 🚨 🚨 🚨\n Unknown Entity:");
      console.log(JSON.stringify(unknown));
      console.log(" - - - - - - - - - - - -");
      console.log(JSON.stringify(tripEntities));
      throw "Unknown Entity";
    }

    function extractTripIds(type, i) {
      let item = i;
      if (type) {
        if (!i[type]) throw `No type value for ${type} in ${JSON.stringify(i)}`;
        item = i[type];
        
      }
      if (!item.trip) throw "No trip data.";
      if (!item.trip.tripId) throw "No trip id.";
      return item.trip.tripId;
    }

    const tripUpdateIds = tripUpdates.map(extractTripIds.bind(this, "tripUpdate"));
    const vehicleIds = vehicles.map(extractTripIds.bind(this, "vehicle"));

    const tripAlerts = alerts.flatMap(i => {
      let alerts = [];
      if (!i.alert.informedEntity) {
        console.log("No informedEntity");
        console.log(i.alert)
        return alerts;
        //throw "No informedEntity";
      }
      alerts = i.alert.informedEntity;
      if (
        i.alert.headerText
        && i.alert.headerText.translation
        && i.alert.headerText.translation[0]
      ) {
        alerts = alerts.map(j => {
          j.texts = i.alert.headerText.translation;
          return j;
        });
      }
      return alerts;
    })

    const alertIds = tripAlerts.map(extractTripIds.bind(this, null));
    
    // Match entities for the same trip:
    tripUpdateIds.forEach((id, index) => {
      const tripUpdateEntity = tripUpdates[index];
      const vehicleIndex = vehicleIds.indexOf(id);
      if (vehicleIndex != -1) {
        let vehicleEntity = vehicles[vehicleIndex];
        tripUpdateEntity.vehicle = vehicleEntity.vehicle;
        vehicleIds.splice(vehicleIndex, 1);
        vehicles.splice(vehicleIndex, 1);
      }

      const alertIndex = alertIds.indexOf(id);
      if (alertIndex != -1) {
        let alertEntity = tripAlerts[alertIndex];
        tripUpdateEntity.alert = alertEntity;
        alertIds.splice(alertIndex, 1);
        tripAlerts.splice(alertIndex, 1);
      }
    });

    if (vehicles.length > 0) {
      throw "Unmatched vehicles remaining: " + vehicles.length;
    }

    return tripUpdates;

  } catch (error) {
    console.log("⛔️ Error:", error);
    return [];
  }
}