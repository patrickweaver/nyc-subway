import lines from "../data/lines.js";
import stationWaitTimes from "../data/stationWaitTimes.js";
import lineGroups from "../data/lineGroups.js";

export default class Train {
  constructor(
    id,
    tripEntity
  ) {
    this.id = id;
    this.mostRecentTripEntity = tripEntity;

    this.direction = null;
    this.intermediateDestinations = [];
    this.nextStopId = null;
    this.currentInterval = null;
    this.currentIntervalNextPointIndex = null;
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
  locate(combinedIntervals, stations) {

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

      // Update .nextStopId for next update to read.
      this.nextStopId = nextStopId;
  
      const trainPos = this.findPosition(waitTimeEstimate, combinedIntervals, stations);

      

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

  findPosition(waitTimeEstimate, combinedIntervals, stations) {

    const nextStopId = this.nextStopId;
    const routeId = this.routeId;
    const direction = this.direction;
    const lineColors = {};
    // 🚸 This is repeated in App.svelete
    lineGroups.forEach(i => {
      i.lines.forEach(j => {
        lineColors[j] = i.color
      });
    });

    const lineColor = lineColors[routeId];
    const directionIntervalOffsetIndex = direction === "N" ? 0 : 1;

    try {
      
      // Confirm route is valid:
      if (!lines[routeId]) {
        throw "Invalid routeId: " + routeId;
      }
      
      // lastNextStation will help us find intermediate stations and points
      // to animate train through.
      let lastNextStationIndex;
      if (this.lastNextStationId && this.lastNextStationId !== nextStopId) {
        // If this is not a new train to us, look up previous value for
        // next station index:
        lastNextStationIndex = lines[routeId].indexOf(this.lastNextStationId);
      }
      
      
      // nextStation and prevStation will help us calculate the current lat/long
      // of the train.
      let nextStation = stations[nextStopId];
      let nextStationIndex = lines[routeId].indexOf(String(nextStation.stopId));
      if (nextStationIndex == -1) {
        throw `Can't find next station in line. (${nextStation.stopId}, ${routeId})`
      }
      let prevStation;
      let prevStationIndex;
  
      // Previous Station index will be different relative to next
      // Station depending on direction of train.
      // 🚸Next station could be index 0?
      let directionOffset = direction === "N" ? -1 : 1; // "S" if not "N"
      prevStationIndex = nextStationIndex - directionOffset;
      
      if (
        !prevStation
        && prevStationIndex >= 0
        && prevStationIndex < lines[routeId].length
      ) {
        const prevStationId = lines[routeId][prevStationIndex];
        prevStation = stations[prevStationId];
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
      const [firstStationId, secondStationId] = establish("N")(direction)(nextStation.stopId, prevStation.stopId)
      
      // Find interval based on nStation and sStation from nextStation and prevStation
      // and retreive what was previously the currentInterval
      const interval = combinedIntervals[firstStationId][secondStationId];
      const lineColorOffsets = interval.offsets[lineColor];
      
      let lastUpdateInterval, lastUpdateNextPointIndex, lastUpdateIntervalPoints;
      if (this.currentInterval) {
        lastUpdateInterval = this.currentInterval;
        lastUpdateNextPointIndex = this.currentIntervalNextPointIndex // property will be overwritten
        const lastUpdateLineColorOffsets = lastUpdateInterval.offsets[lineColor];
        lastUpdateIntervalPoints = lastUpdateLineColorOffsets[directionIntervalOffsetIndex];
      }

      this.currentInterval = interval;

      const progress = this.getProgress(waitTimeEstimate);
      
      let nextPoint, nextPointIndex, prevPoint, prevPointIndex, pointProgress;
      if (progress === 1) {
        // Train has reached exactly the end of the interval (0 seconds)
        nextPointIndex = interval.distances.length - 1;
        prevPointIndex = nextPointIndex - 1;
        pointProgress = 1;
      } else {
        // Progress through the current interval's total distance
        const progressDistance = progress * interval.totalDistance;

        // Find the last point in the interval the train passed
        prevPointIndex = interval.distances.reduce((prevPointIndex, distance, index) => {
          return distance > progressDistance ? prevPointIndex : index;
        });
        nextPointIndex = prevPointIndex + 1

        // Save that point as lat/lng
        prevPoint = lineColorOffsets[prevPointIndex][directionIntervalOffsetIndex];

        // Find how far in distance the train has progressed between prev and next points
        const prevDistance = interval.distances[prevPointIndex];
        const nextDistance = interval.distances[prevPointIndex + 1];
        const dNextPrev = nextDistance - prevDistance;
        const dCurrentPrev = progressDistance - prevDistance;
        pointProgress = dCurrentPrev / dNextPrev;
      }

      nextPoint = lineColorOffsets[nextPointIndex][directionIntervalOffsetIndex];
      this.currentIntervalNextPointIndex = nextPointIndex;

      // If train is at exactly the end of the interval there is no previous point
      let trainPos;
      if (!prevPoint) {
        trainPos = nextPoint;
      } else {
      // Otherwise weight an average between the nextPoint and prevPoint based on
      // point progress
        const dLat = pointProgress * (nextPoint[0] - prevPoint[0]);
        const dLong = pointProgress * (nextPoint[1] - prevPoint[1]);
        trainPos = [prevPoint[0] + dLat, prevPoint[1] + dLong];
      }

      // Find every point on the track that the train is on between what was previously
      // the next point and what the current location is and save in intermediateDestinations.
      let intermediateDestinations = [];
      // If this is the first time we have seen the train there is no previousInterval.
      if (lastUpdateInterval) {
        // Train is not still in the same interval
        if (lastUpdateInterval.id !== interval.id) {
          // Add the rest of the points in the interval it was in
          const lastIndex = lastUpdateInterval.distances.length - 1;
          const pointsFromLastUpdateInterval = lastUpdateInterval.getPoints(lineColor, direction, lastUpdateNextPointIndex, lastIndex);
          intermediateDestinations = intermediateDestinations.concat(pointsFromLastUpdateInterval);
        // 🧱 Find the rest of the intervals we may have passed and add their points

        }

      }

          // // Train has passed any new points (otherwise there
          // // are no intermediateDestinations)
          // if (lastUpdateNextPointIndex > nextPointIndex) {
          //   // Last point it passed in this interval is the previous point it passed.
          //   lastUpdateIntervalLastPointPassedIndex = prevPointIndex;
          // }

      // 🧱 Add the points we have passed from the new currentInterval


      // for (let i = this.currentIntervalNextPointIndex; i <= prevLastPassedPointIndex; i++) {
      //   const point = previousIntervalPoints[i];
      //   intermediateDestinations.push({
      //     latitude: point[0],
      //     longitude: point[1],
      //   })
      // }

      
      // if (lastNextStationIndex && lastNextStationIndex !== nextStationIndex) {
      //   // Add in between stations to .intermediateDestinations. Most
      //   // of the time this won't add anything. 
      //   for (
      //     let i = lastNextStationIndex;
      //     i !== nextStationIndex;
      //     i += directionOffset
      //   ) {
      //     const stationId = lines[routeId][i];
      //     const station = stations[stationId];
      //     const latitude = station.stopId;
      //     const longitude = station.stopId;
      //     intermediateDestinations.push({
      //       latitude: latitude,
      //       longitude: longitude
      //     });
      //   }
      // }
      

      return {
        latitude: trainPos[0],
        longitude: trainPos[1],
        intermediateDestinations: intermediateDestinations
      }
  
    } catch (error) {
      console.log("Error finding train location:\n", error)
      return null;
    }
  }

  // Calculate the train's progress based on the current wait time to the next
  // station and the average (or max) wait time for that interval.
  getProgress(waitTimeEstimate) {
    const nextStopId = this.nextStopId;
    const routeId = this.routeId;
    const direction = this.direction;
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
    return progress;
  }

}