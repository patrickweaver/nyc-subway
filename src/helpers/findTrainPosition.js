import lines from "../data/lines.js";
import stations from "./stations.js";
import stationWaitTimes from "../data/stationWaitTimes.js";

export default function findTrainPosition(nextStopId, routeId, direction, waitTimeEstimate) {

  try {
    // Find next station stationId in list of stations
    // for the route. Then use index of next station to
    // find the previous station on the route.
    if (!lines[routeId]) {
      throw "Invalid routeId: " + routeId;
    }

    let nextStation = stations.findByGTFS(nextStopId);

    let nextStationIndex = lines[routeId].indexOf(nextStation["GTFS Stop ID"]);
    
    let prevStation;
    // Previous Station index will be different relative to next
    // Station depending on direction of train.
    let prevStationOffset = 1; // N default
    if (direction === "S") {
      prevStationOffset = -1;
    }
    let prevStationIndex = nextStationIndex + prevStationOffset;


    if (prevStationIndex >= 0 && prevStationIndex < lines[routeId].length) {
      prevStation = stations.findByGTFS(lines[routeId][prevStationIndex])
    } else {
      // 🚧 Trains waiting to begin journey have next stop as first or last
      // but will not have a previous station index.
      console.log("⏱ Next Stop:", nextStopId, "Route Id:", routeId, "Direction:", direction);
      throw 'Invalid previous station index.'
    }

    if (!prevStation) {
      throw "Can't find previous station"
    }

    //🚧 Calculate lat/long mid-way between the next statio and the previous
    // station.
    const waitTimes = stationWaitTimes[routeId][nextStopId][direction];
    let progress = waitTimeEstimate / waitTimes.avg;
    if (progress > 1) {
      progress = waitTimeEstimate / waitTimes.max;
      if (progress > 1) {
        // 🚸 There may be a way to look into data here to see what might cause this situation
        progress = 0;
      }
    }
    const nextLat = nextStation['GTFS Latitude'];
    const nextLong = nextStation['GTFS Longitude'];
    const prevLat = prevStation['GTFS Latitude'];
    const prevLong = prevStation['GTFS Longitude'];
    const dLat = progress * (nextLat - prevLat);
    const dLong = progress * (nextLong - prevLong);
    let trainLat = prevLat + dLat;
    let trainLong = prevLong + dLong;

    return { lat: trainLat, long: trainLong }

  } catch (error) {
    console.log("Error finding train location:\n", error)
    return null;
  }
}