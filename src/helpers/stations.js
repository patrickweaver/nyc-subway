import { stations } from './stationData.js';
import * as lines from './lines.js';

function findByGTFS(gtfsId, containsDirection=false) {
  let stationGtfsId = gtfsId;
  if (containsDirection) {
    // Split GTFS Id from station direction
    stationGtfsId = gtfsId.substring(0, gtfsId.length - 1);
    const direction = gtfsId.substring(gtfsId.length - 1, gtfsId.length);
  }
  // Create array of just GTFS Ids and find index of station
  const gtfsArray = stations.map(i => i['GTFS Stop ID'])
  const index = gtfsArray.indexOf(stationGtfsId);
  if (index === -1) {
    console.log('🦞 Station not found: ', stationGtfsId);
    return null;
  }
  // Get full station data using index
  const station = stations[index];
  if (containsDirection) {
    // Store direction and split Daytime Routes into array
    station.direction = direction;
  }
  station.daytimeRoutesArray = String(station['Daytime Routes']).split(' ');
  return station;
}

function compareByLatitude(a, b) {
  let aLong = a['GTFS Latitude'];
  let bLong = b['GTFS Latitude'];
  if (aLong > bLong) {
    return -1;
  }
  if (bLong > aLong) {
    return 1;
  }
  return 0;
}

function compareByLineOrder(lineOrder, a, b) {
  try {
    // Isolate GTFS Stop Id
    let aId = a['GTFS Stop ID'];
    let bId = b['GTFS Stop ID'];

    // Find index of GTFS Stop Id in line order
    let aIndex = lineOrder.indexOf(aId);
    let bIndex = lineOrder.indexOf(bId);

    // Throw error if either GTFS Stop Id is not found
    if (aIndex === -1) {
      throw `Station ${aId} not in line.`;
    }
    if (bIndex === -1) {
      throw `Station ${bId} not in line.`;
    }

    // Return sort order based on indexes
    if (aIndex > bIndex) {
      return -1;
    }
    if (bIndex > aIndex) {
      return 1;
    }
    return 0;

  } catch (error) {
    console.log("ERROR:", error)
    return error;
  }
}

function getLineStops(line) {
  // Filter out all stations where train doesn't stop:
  let lineStations = stations.filter(station => {
    const linesArray = String(station['Daytime Routes']).split(' ');
    if (linesArray.indexOf(line.toUpperCase()) > -1) {
      return true
    }
  });

  let compareByGOrder = compareByLineOrder.bind(this, lines['G']);
  lineStations.sort(compareByGOrder);
  
  // Split Daytime Routes into array
  const formattedLineStations = lineStations.map(station => {
    station.daytimeRoutesArray = String(station['Daytime Routes']).split(' ');
    return station;
  })
  return formattedLineStations;
}

export default {
  stations: stations,
  findByGTFS: findByGTFS,
  getLineStops: getLineStops
}