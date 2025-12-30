import type {
  FeedEntityData,
  FeedEntityTripUpdateData,
  FeedEntityVehicleData,
  FeedEntityAlertData,
  Alert,
  EntityTripUpdate,
  FeedEntityDataWithTimestamp,
} from "../types";

function isFeedEntityTripUpdateData(
  d: FeedEntityData
): d is FeedEntityTripUpdateData {
  return (d as FeedEntityTripUpdateData).tripUpdate !== undefined;
}

function isFeedEntityVehicleData(
  d: FeedEntityData
): d is FeedEntityVehicleData {
  return (d as FeedEntityVehicleData).vehicle !== undefined;
}

function isFeedEntityAlertData(d: FeedEntityData): d is FeedEntityAlertData {
  return (d as FeedEntityAlertData).alert !== undefined;
}

// Extracts tripId property which can be the child of
// multiple kinds of properites.
function extractTripIds(
  type: "tripUpdate" | "vehicle" | null,
  i: FeedEntityData
) {
  if (type) {
    if (isFeedEntityTripUpdateData(i)) {
      if (!i.tripUpdate?.trip?.tripId) throw "No trip data or trip id";
      return i.tripUpdate.trip.tripId;
    }
    if (isFeedEntityVehicleData(i)) {
      if (!i.vehicle?.trip?.tripId) throw "No trip data or trip id";
      return i.vehicle.trip.tripId;
    } else {
      throw `No type value for ${type} in ${JSON.stringify(i)}`;
    }
  }
  throw "Invalid type";
}

export default function mergeTripUpdateAndVehicleEntities(
  tripEntities: FeedEntityDataWithTimestamp[]
): EntityTripUpdate[] {
  try {
    const { tripUpdates, vehicles, alerts } = tripEntities.reduce(
      (
        a: {
          tripUpdates: FeedEntityTripUpdateData[];
          vehicles: FeedEntityVehicleData[];
          alerts: FeedEntityAlertData[];
        },
        c: FeedEntityData
      ) => {
        if (isFeedEntityTripUpdateData(c)) a.tripUpdates.push(c);
        else if (isFeedEntityVehicleData(c)) a.vehicles.push(c);
        else if (isFeedEntityAlertData(c)) a.alerts.push(c);
        return a;
      },
      { tripUpdates: [], vehicles: [], alerts: [] }
    );

    //console.log("🧤", tripUpdates.length, vehicles.length, unknown.length)

    // 🍄 Disabling this for now
    // Unknown entities shouldn't happen, but sometimes new types appear
    // 🚸 Update this to log errors rather than throw.
    // if (unknown.length > 0) {
    //   console.log("🚨 🚨 🚨 🚨 🚨 🚨\n Unknown Entity:");
    //   console.log(JSON.stringify(unknown));
    //   console.log(" - - - - - - - - - - - -");
    //   console.log(JSON.stringify(tripEntities));
    //   throw "Unknown Entity";
    // }

    // 🍄 Figure this out
    // Extract useful information from alert entities
    const tripAlerts = alerts.map((i) => {
      console.log("Alert:", i);
      return i;
      // let _alert: Alert = {};
      // if (!i.alert.informedEntity) {
      //   console.log("No informedEntity");
      //   console.log(i.alert);
      //   return i;
      //   //throw "No informedEntity";
      // }
      // _alert.informedEntity = i.alert.informedEntity;
      // if (i.alert?.headerText?.translation[0]) {
      //   _alert.texts = i.alert.headerText.translation;
      // }
      // return alerts;
    });

    // Create arrays of tripIds for entity type arrays
    const tripUpdateIds = tripUpdates.map((i) =>
      extractTripIds("tripUpdate", i)
    );
    const vehicleIds = vehicles.map((i) => extractTripIds("vehicle", i));
    const alertIds = tripAlerts.map((i) => extractTripIds(null, i));

    // Match entities for the same trip from the different types arrays:
    const tripUpdateEntities = tripUpdateIds.map((id, index) => {
      const tripUpdateEntity: EntityTripUpdate = {
        ...tripUpdates[index],
        vehicle: null,
        alert: null,
      };
      const vehicleIndex = vehicleIds.indexOf(id);
      if (vehicleIndex > 0) {
        let vehicleEntity = vehicles[vehicleIndex];
        tripUpdateEntity.vehicle = vehicleEntity.vehicle;
        vehicleIds.splice(vehicleIndex, 1);
        vehicles.splice(vehicleIndex, 1);
      }

      const alertIndex = alertIds.indexOf(id);
      if (alertIndex > 0) {
        let alertEntity = tripAlerts[alertIndex];
        tripUpdateEntity.alert = alertEntity.alert;
        alertIds.splice(alertIndex, 1);
        tripAlerts.splice(alertIndex, 1);
      }
      return tripUpdateEntity;
    });

    if (vehicles.length > 0) {
      console.log("🚟 Unmatched vehicles remaining: " + vehicles.length);
      //throw "Unmatched vehicles remaining: " + vehicles.length;
    }

    return tripUpdateEntities;
  } catch (error) {
    console.log("⛔️ Error:", error);
    return [];
  }
}
