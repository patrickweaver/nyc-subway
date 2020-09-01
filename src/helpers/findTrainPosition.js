import lines from "../data/lines.js";
import stationHelpers from "./stationHelpers.js";
import stationWaitTimes from "../data/stationWaitTimes.js";

export default function findTrainPosition(lastNextStationId, nextStopId, routeId, direction, waitTimeEstimate) {

  try {
    
    // Confirm route is valid:
    if (!lines[routeId]) {
      throw "Invalid routeId: " + routeId;
    }

    // lastNextStation will help us find intermediate stations to animate
    // train through.
    let lastNextStationIndex;
    if (lastNextStationId && lastNextStationId !== nextStopId) {
      // If this is not a new train to us, look up previous value for
      // next station index:
      lastNextStationIndex = lines[routeId].indexOf(lastNextStationId);
    }
    
    // nextStation and prevStation will help us calculate the current lat/long
    // of the train.
    let nextStation = stationHelpers.findByGTFS(nextStopId);
    let nextStationIndex = lines[routeId].indexOf(nextStation["GTFS Stop ID"]);
    let prevStation;
    let prevStationIndex;

    // Previous Station index will be different relative to next
    // Station depending on direction of train.
    // 🚸Next station could be index 0?
    let directionOffset = direction === "N" ? -1 : 1; // "S" if not "N"
    prevStationIndex = nextStationIndex - directionOffset;
    

    const intermediateDestinations = [];
    if (lastNextStationIndex && lastNextStationIndex !== nextStationIndex) {
      // Add in between stations to .intermediateDestinations. Most
      // of the time this won't add anything. 
      for (
        let i = lastNextStationIndex;
        i !== nextStationIndex;
        i += directionOffset
      ) {
        const stationId = lines[routeId][i];
        const station = stationHelpers.findByGTFS(stationId);
        const latitude = station["GTFS Latitude"];
        const longitude = station["GTFS Longitude"];
        intermediateDestinations.push({
          latitude: latitude,
          longitude: longitude,
          index: i
        });
      }
    }

    if (
      !prevStation
      && prevStationIndex >= 0
      && prevStationIndex < lines[routeId].length
    ) {
      prevStation = stationHelpers.findByGTFS(lines[routeId][prevStationIndex])
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

    return {
      latitude: trainLat,
      longitude: trainLong,
      intermediateDestinations: intermediateDestinations
    }

  } catch (error) {
    console.log("Error finding train location:\n", error)
    return null;
  }
}