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
    this.progress = 0;
  }
  
  // Update a train's lat/long based on it's most recent
  // next stationand expected arrival time.
  locate(combinedIntervals, stations) {

    try {

      if (!this.id || !this.mostRecentTripEntity) {
        throw "Incomplete train data."
      }

      let te = this.mostRecentTripEntity
        
      let nextStopUpdate;
      // In case arrivalEstimate is negative loop through
      let index = 0;
      let arrivalEstimate = 0;
      while (arrivalEstimate < te.timestamp) {
        nextStopUpdate = te.stopTimeUpdates[index];
        arrivalEstimate = parseInt(nextStopUpdate.arrival);
        index += 1;
        if (index === te.stopTimeUpdates.length) {
          // 🚸 When does this happen?
          console.log("All arrival estimates are in the past.")
          arrivalEstimate = te.timestamp;
          break;
        }
      }
  
      // 🚸 These shouldn't change, but what if they do?
      this.routeId = te.trip.routeId;
      this.direction = te.trip.direction;
      const nextStopId = nextStopUpdate.GtfsStopId;
      const waitTimeEstimate = arrivalEstimate - te.timestamp;

      if (waitTimeEstimate < 0) {
        debugger;
      }
  
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

    console.log(`\n\n🗺 Locating train ${this.id} going ${this.direction}`);
    const nextStopId = this.nextStopId;
    const routeId = this.routeId;
    const direction = this.direction;
    const N = direction === "N";
    const lineColors = {};
    // 🚸 This is repeated in App.svelete
    lineGroups.forEach(i => {
      i.lines.forEach(j => {
        lineColors[j] = i.color
      });
    });

    const lineColor = lineColors[routeId];
    const directionIntervalOffsetIndex = N ? 0 : 1;
    const directionOffset = N ? -1 : 1; // "S" if not "N"

    try {
      
      // Confirm route is valid:
      if (!lines[routeId]) {
        throw "Invalid routeId: " + routeId;
      }
      
      
      // Locate train between two stations based on the direction and the nextStation
      let nextStation = stations[nextStopId];
      let nextStationIndex = lines[routeId].indexOf(String(nextStation.stopId));
      if (nextStationIndex == -1) {
        throw `Can't find next station in line. (${nextStation.stopId}, ${routeId})`
      }
      let prevStation;
      let prevStationIndex;
  
      // Previous Station index will be different relative to next
      // Station depending on direction of train.
      prevStationIndex = nextStationIndex - directionOffset;
      
      if (
        !prevStation
        && prevStationIndex >= 0 // nextStation is first in array, direction is "S"
        && prevStationIndex < lines[routeId].length // nextStation is last, direction is "N"
      ) {
        const prevStationId = lines[routeId][prevStationIndex];
        prevStation = stations[prevStationId];
      } else {
        // 🚧 Trains waiting to begin journey have next stop as first or last
        // but will not have a previous station index.
        console.log("⏱ Next Stop:", nextStopId, "Route Id:", routeId, "Direction:", direction);
        debugger;
        throw 'Invalid previous station index.'
      }
      
  
      if (!prevStation) {
        throw "Can't find previous station"
      }

      console.log(`🦄 ${this.id} prevStop: ${prevStation.name}, Next stop: ${nextStation.name}, arriving in ${waitTimeEstimate}`)
  
      // Set the order of the nextStation and prevStation based on whether
      // the train is going N or S. The order will be used to look up the 
      // current interval which has the nStation as the first key and the
      // sStation as the second key.
      const establish = bound => direction => (aStation, bStation) => {
        return bound === direction ? [aStation, bStation] : [bStation, aStation];
      }
      const [nStationId, sStationId] = establish("N")(direction)(nextStation.stopId, prevStation.stopId)
      
      // Find interval based on nStation and sStation from nextStation and prevStation
      // and retreive what was previously the currentInterval
      const interval = combinedIntervals[nStationId][sStationId];
      const intervalLineColorOffsets = interval.offsets[lineColor];
      
      let lastUpdateInterval, lastUpdateNextPointIndex, lastUpdateIntervalPoints;
      if (this.currentInterval) {
        lastUpdateInterval = this.currentInterval;
        lastUpdateNextPointIndex = this.currentIntervalNextPointIndex // saving becuase property will be overwritten
        const lastUpdateIntervalLineColorOffsets = lastUpdateInterval.offsets[lineColor];
        lastUpdateIntervalPoints = lastUpdateIntervalLineColorOffsets[directionIntervalOffsetIndex];
      }

      this.currentInterval = interval;

      let progress = this.getProgress(waitTimeEstimate);
      // Don't let trains go backwards on the same interval
      // even if progress goes down
      if (lastUpdateInterval && lastUpdateInterval.id === interval.id) {
        if (progress < this.progress) {
          progress = this.progress;
        }
      }
      // Save progress for next tick to compare.
      this.progress = progress;


      console.log(`🎞 ${this.id} -- ${direction} bound train has progressed ${Math.floor(progress * 100)}% or ${progress * interval.totalDistance} through ${interval.id} which has ${interval.distances[direction].length} points and is ${interval.totalDistance} long`)
      
      let nextPoint, nextPointIndex, prevPoint, prevPointIndex, pointProgress;
      if (progress === 1) {
        // Train has reached exactly the end of the interval (0 seconds)
        nextPointIndex = interval.distances[direction].length - 1;
        prevPointIndex = nextPointIndex - 1;
        pointProgress = 1;
      } else if (progress === 0) {
        prevPointIndex = interval.distances[direction].length - 1;
        nextPointIndex = prevPointIndex - 1;
        pointProgress = 0;
      } else {
        // Progress through the current interval's total distance
        const progressDistance = progress * interval.totalDistance;

        // Find the last point in the interval the train passed
        // 🚸 Double check this
        prevPointIndex = interval.distances[direction].reduce((prevPointIndex, distance, index) => {
          if (N) {
            return distance < progressDistance ? prevPointIndex : index + 1;
          } else {
            return distance > progressDistance ? prevPointIndex : index;
          }
        }, 0);

        nextPointIndex = prevPointIndex + directionOffset;

        
        if (!intervalLineColorOffsets[prevPointIndex]) {
          debugger;
        }
        // Save that point as lat/lng
        prevPoint = intervalLineColorOffsets[prevPointIndex][directionIntervalOffsetIndex];

        // Find how far in distance the train has progressed between prev  and next points
        const prevDistance = interval.distances[direction][prevPointIndex];
        const nextDistance = interval.distances[direction][nextPointIndex];
        const dNextPrev = nextDistance - prevDistance;
        const dCurrentPrev = progressDistance - prevDistance;
        pointProgress = dCurrentPrev / dNextPrev;

        //console.log(`The previous point was index ${prevPointIndex} at distance ${prevDistance}, the next point is index ${nextPointIndex} at distance ${nextDistance}`);
        //console.log(`The distance between those two is ${dNextPrev} and the distance between the train and the previous is ${dCurrentPrev}`);
        
        // 🚸 Saw NaN point progress
        if (Number.isNaN(pointProgress) || pointProgress < 0) {
          debugger;
        }
      }

      
      // 🚸 This was happening sometimes
      if (!intervalLineColorOffsets[nextPointIndex]){
        debugger;
      }

      nextPoint = intervalLineColorOffsets[nextPointIndex][directionIntervalOffsetIndex];
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

      console.log(`⛺️ ${this.id} -- Interval: ${interval.id}, progress: ${progress}, nextPoint: ${nextPointIndex}, pointProgress: ${pointProgress}`);

      // Find every point on the track that the train is on between what was previously
      // the next point and what the current location is and save in intermediateDestinations.
      let intermediateDestinations = [];
      let intermediatePoints = [];

      // If this is the first time we have seen the train there is no previousInterval.
      if (lastUpdateInterval) {
        
        console.log(this.id, `🕰 lastUpdateInterval: ${lastUpdateInterval.id}`);
        // Train is not still in the same interval
        if (lastUpdateInterval.id !== interval.id) {
          console.log(this.id, `🏡 in new interval (${interval.id}), previous was ${lastUpdateInterval.id}`);
          // Add the rest of the points in the interval it was in
          const lastIndex = N ? 0 : lastUpdateInterval.distances[direction].length - 1;
          const pointsFromLastUpdateInterval = lastUpdateInterval.getPoints(lineColor, direction, lastUpdateNextPointIndex, lastIndex);
          intermediateDestinations = intermediateDestinations.concat(pointsFromLastUpdateInterval);
          intermediatePoints.push(`${lastUpdateNextPointIndex} to ${lastIndex} from ${lastUpdateInterval.id}`)
          console.log(`💎 ${this.id} finishing interval from %c${lastUpdateNextPointIndex}%c to %c${lastIndex}%c`, "color: red;", "color: black;", "color: red;", "color: black;")
          console.log("💚", this.id, intermediatePoints);
          console.log(this.id, intermediateDestinations.length, intermediateDestinations)

          // 🧱 Find the rest of the intervals we may have passed and add their points
          const intermediateIntervals = [];
          const ciNStopId = interval.nStation.stopId;
          const cNStationIndex = lines[routeId].indexOf(ciNStopId);
          const luiNStopId = lastUpdateInterval.nStation.stopId;
          const luiNStationIndex = lines[routeId].indexOf(luiNStopId);

          for (let i = luiNStationIndex + directionOffset; i !== cNStationIndex + directionOffset; i += directionOffset) {
            const piNStationStopId = lines[routeId][i];
            const piSStationStopId = lines[routeId][i + 1];
            if (!combinedIntervals[piNStationStopId] || !combinedIntervals[piNStationStopId][piSStationStopId]) {
              console.log("Invalid Interval!")
              debugger;
            }
            const prevInterval = combinedIntervals[piNStationStopId][piSStationStopId];
            console.log(`🔋 ${this.id} -- Looping intervals: N: ${piNStationStopId} (${stations[piNStationStopId].name}), S: ${piSStationStopId} (${stations[piSStationStopId].name}), Interval: ${prevInterval ? prevInterval.id : 'Invalid Interval'}`);
            if (!prevInterval) {
              debugger
            }
            console.log(`🌋 ${this.id} -- Also passed interval ${prevInterval.id}`)
            // If this is the current interval:
            const startIndex = N ? prevInterval.distances[direction].length - 1 : 0;
            let endIndex = N ? 0 : prevInterval.distances[direction].length - 1;
            if (interval.id === prevInterval.id) {
              endIndex = prevPointIndex;
            }
            intermediateDestinations = intermediateDestinations.concat(prevInterval.getPoints(lineColor, direction, startIndex, endIndex));
            intermediatePoints.push(`${startIndex} to ${endIndex} from ${prevInterval.id}`)
            console.log("🧡", this.id, intermediatePoints);
            console.log(this.id, intermediateDestinations.length, intermediateDestinations)
          }
          

        } else {
        // Still in the same interval but may have passed points:
          if (lastUpdateNextPointIndex < nextPointIndex) {
            intermediateDestinations = intermediateDestinations.concat(interval.getPoints(lineColor, direction, lastUpdateNextPointIndex, prevPointIndex));
            intermediatePoints.push(`${lastUpdateNextPointIndex} to ${prevPointIndex} from ${interval.id}`)
            console.log(`🛢 ${this.id} moving withing interval from %c${lastUpdateNextPointIndex}%c to %c${prevPointIndex}%c`, "color: red;", "color: black;", "color: red;", "color: black;")
          }
        }

        

      }

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
    let progressRemaining = waitTimeEstimate / waitTimes.avg;
    // Wait time is longer than average
    if (progressRemaining > 1) {
      progressRemaining = waitTimeEstimate / waitTimes.max;
    }
    // Wait time is longer than max seen
    if (progressRemaining > 1) {
      progressRemaining = 1;
    }
    
    const progress = 1 - progressRemaining;
    //console.log(`⌚️ Checking Progress for ${this.id} going ${direction}, wait time is ${waitTimeEstimate}, average is ${waitTimes.avg}, max is ${waitTimes.max}, progress is ${Math.floor(progress * 100)}`)
    return progress;
  }

}