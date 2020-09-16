require('dotenv').config();
const fs = require("fs");
const getFeed = require("../server/helpers/getFeed.js");
const mergeTripUpdateAndVehicleEntities = require("./mergeTripUpdateAndVehicleEntities.js");

var lineGroupIntervals = require("./lineGroupIntervals.js");

const lineGroups = require("./lineGroups.js");

main();
setInterval(main, 1000 * 60 * 5);

async function main() {

  for (lineGroup of lineGroups) {
    await getLineGroup(lineGroup);
  }

  try {
    const lineGroupIntervalsCopy = `// A list of pairs of stationIds, this is the same as /src/data/lineGroupIntervals.js

    module.exports = `

    const filename = "./tools/lineGroupIntervals.js";
    fs.writeFile(filename, lineGroupIntervalsCopy + JSON.stringify(lineGroupIntervals), function (err) {
      if (err) return console.log("Error:\n", err);
      console.log(`stop ID line data written to ${filename}`);
    });
  } catch (error) {
    console.log("Error writing file")
  }
}

async function getLineGroup(lineGroup) {
  try {
    // Populate empty array on first run
    if (!lineGroupIntervals[lineGroup.color]) {
      lineGroupIntervals[lineGroup.color] = [];
    }

    // Request line group data from API:
    const apiResponse = await getFeed(lineGroup.apiSuffix);
    // Filter to only entities with a tripUpdate property
    const tripUpdateEntities = apiResponse.entity.filter(i => i.tripUpdate ? true : false)

    // Filter to only valid South bound trips
    lineGroupTripEntities = tripUpdateEntities.filter(i => {
      if (!i.tripUpdate) return false;
      if (!i.tripUpdate.trip) return false;
      if (!i.tripUpdate.trip.routeId) return false;
      if (!i.tripUpdate.trip.tripId) return false;
      const tripId = i.tripUpdate.trip.tripId;
      let direction;
      if (!tripId.split("..")[1]) { // Sometimes there is one dot??
        direction = tripId.split(".")[1][0];
      } else {
        direction = tripId.split("..")[1][0];
      }
      if (direction != "S") return false;
      return true;
    });

    // Extract stopIds from tripUpdates with direction removed
    const updateStopIds = lineGroupTripEntities.map(entity => {
      if (!entity.tripUpdate) return null;
      if (!entity.tripUpdate.stopTimeUpdate) return null;
      if (!entity.tripUpdate.stopTimeUpdate[0]) return null;
      // remove direction from stopId string
      return entity.tripUpdate.stopTimeUpdate.map(stationUpdate => stationUpdate.stopId.substring(0, stationUpdate.stopId.length - 1));
    }).filter(i => i); // Filter out nulls

    // Loop through in pairs, see if interval already is present
    console.log("\n",lineGroup.color);
    const updatedIntervals = updateStopIds.flatMap(tripStopIds => {
      return tripStopIds.map((stopId, index) => {
        if (index === tripStopIds.length - 1) {
          return []; // Skip last one
        }
        const nextStopId = tripStopIds[index + 1];
        const interval = [stopId, nextStopId];
        return interval;
      });
    }).filter(i => i && i.length == 2); // Filter out empties;

    const currentIntervalStrings = lineGroupIntervals[lineGroup.color].map(i => JSON.stringify(i));
    const updatedIntervalsStrings = updatedIntervals.map(i => JSON.stringify(i));

    const newIntervals = updatedIntervals.filter((i, index) => {
      const stringVer = updatedIntervalsStrings[index];
      if (currentIntervalStrings.indexOf(stringVer) === -1) {
        return true
      }
      return false;
    });

    console.log(`Adding ${newIntervals.length} new intervals.`)


    // Current color:
    lineGroupIntervals[lineGroup.color] = Array.from(new Set(
      lineGroupIntervals[lineGroup.color].concat(newIntervals).map(i => JSON.stringify(i))
    )).map(i => JSON.parse(i));


  } catch (error) {
    console.log("👺 makeLineList Error for line", lineGroup.lines.join(""), ":");
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ")
    console.log(error);
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ")
  }
}