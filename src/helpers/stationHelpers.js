import Station from "../classes/Station.js";

import stationData from "../data/stationData.js";
import lines from "../data/lines.js";

// Compare two stations by where they are in the train's route
function compareByLineOrder(lineOrder, a, b) {
  try {
    // Isolate GTFS Stop Id
    let aId = a["GTFS Stop ID"].toString();
    let bId = b["GTFS Stop ID"].toString();

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
    console.log("⛔️ Error:", error);
    return error;
  }
}

// Get the stations where the train currently stops
// 🚸 Implementation has 'Daytime Routes' hard coded.
function getLineStops(lineId) {
  lineId = lineId.toUpperCase();
  // Filter out all stations where train doesn't stop:
  function lineStopsAtStation(stationDataItem) {
    const linesArray = String(stationDataItem["Daytime Routes"]).split(" ");
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
  const formattedLineStations = lineStations.map((station) => {
    station.daytimeRoutesArray = String(station["Daytime Routes"]).split(" ");
    return station;
  });

  const stationObjects = formattedLineStations.map((s) => new Station(s));

  const stationsWithOffsets = stationObjects.map(
    (stationB, index, stations) => {
      let stationA = null;
      let stationC = null;
      if (index > 0) {
        stationA = stations[index - 1];
      }
      if (index < stations.length - 1) {
        stationC = stations[index + 1];
      }

      stationB.offsets = Station.findOffsetPoints(
        stationA,
        stationB,
        stationC,
        20,
      );
      return stationB;
    },
  );

  return stationsWithOffsets;
}

export default {
  getLineStops: getLineStops,
};
