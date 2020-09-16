import Station from "../classes/Station.js";

import stationData from "../data/stationData.js";
import lines from "../data/lines.js";

import Victor from 'victor';

// Find a full station object from a GTFS Stop Id
function findByGTFS(gtfsId, containsDirection=false) {
  let stationGtfsId = gtfsId;
  if (containsDirection) {
    // Split GTFS Id from station direction
    stationGtfsId = gtfsId.substring(0, gtfsId.length - 1);
    const direction = gtfsId.substring(gtfsId.length - 1, gtfsId.length);
  }
  // Create array of just GTFS Ids and find index of station
  const gtfsArray = stationData.map(i => String(i['GTFS Stop ID']));
  const index = gtfsArray.indexOf(stationGtfsId);
  if (index === -1) {
    console.log('🦞 Station not found: ', stationGtfsId);
    return null;
  }
  // Get full station data using index
  const station = stationData[index];
  if (containsDirection) {
    // Store direction and split Daytime Routes into array
    station.direction = direction;
  }
  station.daytimeRoutesArray = String(station['Daytime Routes']).split(' ');
  
  return station;
}

// Compare two stations by where they are in the train's route
function compareByLineOrder(lineOrder, a, b) {
  try {
    // Isolate GTFS Stop Id
    let aId = a['GTFS Stop ID'].toString();
    let bId = b['GTFS Stop ID'].toString();

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
    console.log("⛔️ Error:", error)
    return error;
  }
}


// Get the stations where the train currently stops
// 🚸 Implementation has 'Daytime Routes' hard coded.
function getLineStops(lineId) {
  lineId = lineId.toUpperCase();
  // Filter out all stations where train doesn't stop:
  function lineStopsAtStation(stationDataItem) {
    const linesArray = String(stationDataItem['Daytime Routes']).split(' ');
    if (linesArray.indexOf(lineId) > -1) {
      return true;
    }
    return false;
  }
  let lineStations = stationData.filter(lineStopsAtStation);

  // 🚸 Will want to want to do this programmatically when showing
  // more than one line.
  let compare = compareByLineOrder.bind(this, lines[lineId]);
  lineStations.sort(compare);
  
  // Split Daytime Routes into array
  const formattedLineStations = lineStations.map(
    station => {
      station.daytimeRoutesArray = String(station['Daytime Routes']).split(' ');
      return station;
    }
  );

  const stationObjects = formattedLineStations.map(s => new Station(s["GTFS Stop ID"], s["GTFS Latitude"], s["GTFS Longitude"], s["Stop Name"]));

  const stationsWithOffsets = stationObjects.map(
    (stationB, index, stations) => {
      let stationA = null;
      let stationC = null;
      if (index > 0) {
        stationA = stations[index - 1];
      }
      if (index < stations.length - 1) {
        stationC = stations[index + 1]
      }

      stationB.offsets = findOffsetPoints(stationA, stationB, stationC);
      return stationB;
    }
  )

  return stationsWithOffsets;
}

// Extrat lat/lng and convert to meters:
function dLatLng(s0, s1) {
  if (!s0 || !s1) {
    return [0, 0];
  }
  return [
    (s1.latitude - s0.latitude) / METER_LAT_OFFSET, 
    (s1.longitude - s0.longitude) / METER_LNG_OFFSET
  ];
}

// Convert meter vector back to Lat/Lng and find offset from set point (Station B):
function offsetFromPoint(pointLat, pointLng, normalizedOffsetMetersX, normalizedOffsetMetersY, offsetLength = 1) {
  return [
    pointLat + (METER_LAT_OFFSET * normalizedOffsetMetersX * offsetLength),
    pointLng + (METER_LNG_OFFSET * normalizedOffsetMetersY * offsetLength)
  ];
}

function findOffsetPoints(stationA, stationB, stationC) {
  // Length of offset line
  const offsetLength = 20;

  const pos = {};
  pos.a = stationA ? [stationA.latitude, stationA.longitude] : null;
  pos.b = stationB ? [stationB.latitude, stationB.longitude] : null;
  pos.c = stationC ? [stationC.latitude, stationC.longitude] : null;

  // Distance between stations A & B and stations B & C in meters:
  let dLatAB, dLngAB, dLatCB, dLngCB;
  [dLatAB, dLngAB] = dLatLng(stationB, stationA);
  [dLatCB, dLngCB] = dLatLng(stationB, stationC);

  // Turn station distances into vectors using Victor: http://victorjs.org/
  const abVector = new Victor(dLatAB, dLngAB);
  const cbVector = new Victor(dLatCB, dLngCB);

  // B is last station on line:
  if (!stationC) {
    const offsetAVector = abVector.clone().normalize().rotate(Math.PI / 2);
    stationB.nOffset = offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, offsetLength);
    stationB.sOffset = offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, -offsetLength);
    return [stationB.nOffset, stationB.sOffset];

    // B is first station on line
  } else if (!stationA) {
    const offsetCVector = cbVector.clone().normalize().rotate(Math.PI / 2);
    // Swap N and S for first station:
    stationB.sOffset = offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, offsetLength);
    stationB.nOffset = offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, -offsetLength);
    return [stationB.nOffset, stationB.sOffset];
  }

  // Create equal magnitude vectors with the same directions:
  const abVectorEqLen = abVector.clone().multiply(new Victor(cbVector.length(), cbVector.length()));
  const cbVectorEqLen = cbVector.clone().multiply(new Victor(abVector.length(), abVector.length()));

  // Create new vector of magnitude 1 meter that bisects abVector and cbVector:
  const offsetBVector = abVectorEqLen.clone().add(cbVectorEqLen).normalize();

  
  
  // Create 2 points on opposite sides of Station B 50 meters away
  // where the angles bisect the lines to Station A and C:
  const oPos = offsetFromPoint(pos.b[0], pos.b[1], offsetBVector.x, offsetBVector.y, offsetLength);
  const oPosNeg = offsetFromPoint(pos.b[0], pos.b[1], offsetBVector.x, offsetBVector.y, -offsetLength);

  const crossProduct = abVector.cross(cbVector);

  if (crossProduct < 0) {
    return [oPosNeg, oPos];
  } else {
    return [oPos, oPosNeg];
  }
  
}

export default {
  findByGTFS: findByGTFS,
  getLineStops: getLineStops
}