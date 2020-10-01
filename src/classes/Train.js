import findTrainPosition from "../helpers/findTrainPosition.js";
import lines from "../data/lines.js";
import stationHelpers from "../helpers/stationHelpers.js";
import stationWaitTimes from "../data/stationWaitTimes.js";

export default class Train {
  constructor(
    id,
    tripEntity
  ) {
    this.id = id;
    this.mostRecentTripEntity = tripEntity;

    this.direction = null;
    this.intermediateDestinations = [];
    this.nextStationId = null;
    this.latitude = null;
    this.longitude = null;
    this.marker = null;
    this.move = false;
    this.draw = false;
    this.remove = false;
    this.routeId = null;
    this.scheduledAt = null;
  }
  
  // Update a train's lat/long based on it's most recent
  // next stationand expected arrival time.
  locate(combinedIntervals) {

    try {

      if (!this.id || !this.mostRecentTripEntity) {
        throw "Incomplete train data."
      }

      let te = this.mostRecentTripEntity
        
      let nextStopUpdate = te.stopTimeUpdates[0];
      let arrivalEstimate = nextStopUpdate.arrival;
  
      // 🚸 Not sure if this will ever happen, but if this is an 
      // already mapped train set wait time to 0
      if (!arrivalEstimate) {
        arrivalEstimate = te.timestamp;
      }
  
      // If arrivalEstimate is negative, look at the second
      // stopTimeUpdate item
      if (arrivalEstimate < te.timestamp) {
        if (te.stopTimeUpdates.length > 1) {
          nextStopUpdate = te.stopTimeUpdates[1];
          arrivalEstimate = nextStopUpdate.arrival;
        } else {
          // 🚸 Unless there is only one, then default to 0
          arrivalEstimate = te.timestamp;
        }
      }
  
      // 🚸 These shouldn't change, but what if they do?
      this.routeId = te.trip.routeId;
      this.direction = te.trip.direction;
      const nextStopId = nextStopUpdate.GtfsStopId;
      const waitTimeEstimate = arrivalEstimate - te.timestamp;
  
      // All trains are either N or S (uptown/downtown)
      if (!(this.direction === 'N' || this.direction === 'S')) {
        throw 'Invalid train direction: ' + this.direction;
      }
  
      const trainPos = findTrainPosition(this.nextStationId, nextStopId, this.routeId, this.direction, waitTimeEstimate, combinedIntervals);

      // Update .nextStationId for next update to read.
      this.nextStationId = nextStopId;

      if (!trainPos.latitude || !trainPos.longitude) {
        throw "Error finding lat/long."
      }

      if (this.marker && this.latitude != trainPos.latitude || this.longitude != trainPos.longitude) {
        this.move = true;
      }

      this.latitude = trainPos.latitude;
      this.longitude = trainPos.longitude;
      this.intermediateDestinations = trainPos.intermediateDestinations

    } catch (error) {
      console.log("Error locating train:", error);
    }
  }

  findTrainPosition(lastNextStationId, nextStopId, routeId, direction, waitTimeEstimate) {

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
  
      //🚧 Calculate lat/long mid-way between the next statio and the previous
      // station.
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

}