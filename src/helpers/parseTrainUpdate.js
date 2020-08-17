import Train from '../classes/Train.js';

import checkIfValidTrip from "./checkIfValidTrip.js";
import lines from './lines.js';
import stations from './stations.js';

export default function parseTrainUpdate(trainUpdate, index, trainsArray) {

  try {

    // Check for required properties in trainUpdate.tripUpdate
    const tripCheck = checkIfValidTrip(index, trainUpdate.tripUpdate);
    if (!tripCheck.valid) {
      throw tripCheck.error;
    }

    // Parse first train stop stopId which contains train direction
    let route = trainUpdate.tripUpdate.trip.routeId;
    let nextStopIdAndDirection = trainUpdate.tripUpdate.stopTimeUpdate[0].stopId;

    // Split apart direction and nextStopId
    let dL = nextStopIdAndDirection.length;
    let direction = nextStopIdAndDirection.substring(dL - 1, dL);
    let nextStopId = nextStopIdAndDirection.substring(0, dL - 1);

    // All trains are either N or S (uptown/downtown)
    if (!(direction === 'N' || direction === 'S')) {
      throw 'Invalid train direction: ' + direction;
    }

    // 🔇 console.log('index:', i, ' -- route:', route, 'stopId:', nextStopIdAndDirection, 'dL:', dL, 'direction:', direction, 'nextStopId:', nextStopId)

    // Need other station data so find by GTFS
    let nextStation = stations.findByGTFS(nextStopId);

    // Find next station stationId in list of stations
    // for the route. Then use index of next station to
    // find the previous station on the route.
    // 🚧 This is wrong for half the trains because the previous station
    // might be the nextStation + 1 instead of - 1.
    let nextStationIndex = lines[route].indexOf(nextStation['GTFS Stop ID']);
    let prevStation;

    // Previous Station index will be different relative to next
    // Station depending on direction of train.
    let prevStationOffset = 1; // N default
    if (direction === 'S') {
      prevStationOffset = -1;
    }
    let prevStationIndex = nextStationIndex + prevStationOffset;


    if (prevStationIndex >= 0 && prevStationIndex < lines[route].length) {
      prevStation = stations.findByGTFS(lines[route][prevStationIndex])
    } else {
      // 🚧 Trains waiting to begin journey have next stop as first or last
      // but will not have a previous station index.
      throw 'Invalid previous station index.'
    }

    /*
    // Log the next few stations this train will be at:
    //console.log(trainUpdate.tripUpdate.trip.tripId, 'nextStopId:', nextStopId, "| next Station GTFS: ", nextStation['GTFS Stop ID'], '| next station name:', nextStation['Stop Name'], '| Next Station Index:', nextStationIndex, '| in', (parseInt(trainUpdate.tripUpdate.stopTimeUpdate[0].arrival.time) - apiTime), 'seconds');
    let nsu = trainUpdate.tripUpdate.stopTimeUpdate[0];
    let at = parseInt(nsu.arrival.time);
    let dt = parseInt(nsu.departure.time);

    // 🔇 console.log(trainUpdate.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at, '(', at - apiTime, 'seconds)', '| departing:', dt, '(', dt - apiTime, 'seconds)', nsu.stopId);

    if (trainUpdate.tripUpdate.stopTimeUpdate[1]) {
      let nsu1 = trainUpdate.tripUpdate.stopTimeUpdate[1];
      var at1 = parseInt(nsu1.arrival.time);
      var dt1 = parseInt(nsu1.departure.time);
      //🔇 console.log(trainUpdate.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at1, '(', at1 - apiTime, 'seconds)', '| departing:', dt1, '(', dt1 - apiTime, 'seconds)', nsu1.stopId);
    }

    if (trainUpdate.tripUpdate.stopTimeUpdate[2]) {
      let nsu2 = trainUpdate.tripUpdate.stopTimeUpdate[2];
      var at2 = parseInt(nsu2.arrival.time);
      var dt2 = parseInt(nsu2.departure.time);
      // 🔇 console.log(trainUpdate.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at2, '(', at2 - apiTime, 'seconds)', '| departing:', dt2, '(', dt2 - apiTime, 'seconds)', nsu2.stopId, '|', at2 - at1);
    }

    if (trainUpdate.tripUpdate.stopTimeUpdate[3]) {
      let nsu3 = trainUpdate.tripUpdate.stopTimeUpdate[3];
      var at3 = parseInt(nsu3.arrival.time);
      var dt3 = parseInt(nsu3.departure.time);
      // 🔇 console.log(trainUpdate.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at3, '(', at3 - apiTime, 'seconds)', '| departing:', dt3, '(', dt3 - apiTime, 'seconds)', nsu3.stopId,  '|', at3 - at2);
    }
    */

    // Can decide where to place train with next and previous station.
    if (prevStation) {
      // 🔇 console.log(trainUpdate.tripUpdate.trip.tripId, "                      | prev Station GTFS: ", prevStation['GTFS Stop ID'], '| prev station name:', prevStation['Stop Name'], '| Prev Station Index:', nextStationIndex - 1)

      //🚧 Calculate lat/long mid-way between the next statio and the previous
      // station.
      let trainLat = (nextStation['GTFS Latitude'] + prevStation['GTFS Latitude']) / 2;
      let trainLong = (nextStation['GTFS Longitude'] + prevStation['GTFS Longitude']) / 2;

      // 🔇 console.log("Drawing Train:", train.tripUpdate.trip.tripId, "at", trainLat, trainLong, 'next stop:', nextStopIdAndDirection, nextStation['Stop Name'])

      let newTrain = false;
      let trainObject = trainsArray.filter(i => i.id === trainUpdate.tripUpdate.trip.tripId)[0]

      // If train is new add to trains array:
      if (!trainObject) {
        newTrain = true;
        trainObject = new Train(trainUpdate.tripUpdate.trip.tripId, trainLat, trainLong, direction)
      }

      return { trainObject: trainObject, newTrain: newTrain }

    } else {
      throw "Can't find previous station, can't draw train."
    }

  } catch(error) {
    console.log("Error parsing train update:\n", error)

    return { trainObject: null, newTrain: null }
  }
}