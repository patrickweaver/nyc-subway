import lines from "../data/lines.js";
import stationHelpers from "./stationHelpers.js";
import stationWaitTimes from "../data/stationWaitTimes.js";
import lineGroups from "../data/lineGroups.js";

export default function findTrainPosition(lastNextStationId, nextStopId, routeId, direction, waitTimeEstimate, combinedIntervals) {

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
    let nextStationIndex = lines[routeId].indexOf(String(nextStation["GTFS Stop ID"]));
    if (nextStationIndex == -1) {
      throw `Can't find next station in line. (${nextStation["GTFS Stop ID"]}, ${routeId})`
    }
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
      debugger;
      // 🚧 Trains waiting to begin journey have next stop as first or last
      // but will not have a previous station index.
      console.log("⏱ Next Stop:", nextStopId, "Route Id:", routeId, "Direction:", direction);
      throw 'Invalid previous station index.'
    }

    if (!prevStation) {
      throw "Can't find previous station"
    }

    // Set the order of the nextStation and prevStation based on whether
    // the train is going N or S.
    const establish = bound => direction => (aStation, bStation) => {
      return bound === direction ? [aStation, bStation] : [bStation, aStation];
    }
    const [firstStationId, secondStationId] = establish("N")(direction)(nextStation["GTFS Stop ID"], prevStation["GTFS Stop ID"])

    // Find interval based on nStation and sStation from nextStation and prevStation
    const interval = combinedIntervals[firstStationId][secondStationId];

    // Calculate the train's progress based on the current wait time to the next
    // station and the average (or max) wait time for that interval.
    let waitTimes = null;
    if (stationWaitTimes[routeId] && stationWaitTimes[routeId][nextStopId] && stationWaitTimes[routeId][nextStopId][direction]) {
      waitTimes = stationWaitTimes[routeId][nextStopId][direction];
    } else {
      waitTimes = {avg: 120, max: 120};
    }
    let progress = waitTimeEstimate / waitTimes.avg;
    if (progress > 1) {
      progress = waitTimeEstimate / waitTimes.max;
      if (progress > 1) {
        // 🚸 There may be a way to look into data here to see what might cause this situation
        progress = 0;
      }
    }

    const distanceProgress = progress * interval.totalDistance;

    const lineColors = {};
    // 🚸 This is repeated in App.svelete
    lineGroups.forEach(i => {
      i.lines.forEach(j => {
        lineColors[j] = i.color
      });
    });

    const lineColor = lineColors[routeId];
    const directionIndex = direction === "N" ? 0 : 1;
    const lineColorOffsets = interval.offsets[lineColor];

    // Train is at last point in the shape
    // 🚸 If shapes are extended one point into and from
    // the previous/next shape this will need to be refactored.
    if (progress === 1) {
      const lastPointIndex = interval.distances.length;
      const trainLocation = lineColorOffsets[lastPointIndex][directionIndex];
      return {
        latitude: trainLocation[0],
        longitude: trainLocation[1],
        intermediateDestinations: intermediateDestinations
      }
    }

    const  prevPointIndex = interval.distances.reduce((prevPointIndex, distance, index) => {
      return distance > distanceProgress ? prevPointIndex : index;
    });
    const prevDistance = interval.distances[prevPointIndex];
    const nextDistance = interval.distances[prevPointIndex + 1];

    const prevPoint = lineColorOffsets[prevPointIndex][directionIndex];
    const nextPoint = lineColorOffsets[prevPointIndex + 1][directionIndex];
    const pointProgress = (nextDistance - distanceProgress) / (nextDistance - prevDistance);

    const dLat = pointProgress * (nextPoint[0] - prevPoint[0]);
    const dLong = pointProgress * (nextPoint[1] - prevPoint[1]);
    let trainLat = prevPoint[0] + dLat;
    let trainLong = prevPoint[1] + dLong;
    debugger;
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