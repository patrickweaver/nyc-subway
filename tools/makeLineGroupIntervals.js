require('dotenv').config();
const fs = require("fs");
const getFeed = require("../server/helpers/getFeed.js");
const mergeTripUpdateAndVehicleEntities = require("./mergeTripUpdateAndVehicleEntities.js");

var lineGroupInervals = require("./lineGroupIntervals.js");

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
    fs.writeFile(filename, linesCopy + JSON.stringify(lines), function (err) {
      if (err) return console.log("Error:\n", err);
      console.log(`stop ID line data written to ${filename}`);
    });
  } catch (error) {
    console.log("Error writing file")
  }
}

async function getLineGroup(lineGroup) {
  try {
    // Request line group data from API:
    const apiResponse = await getFeed(lineGroup.apiSuffix);
    // Filter to only entities with a tripUpdate property
    const tripUpdateEntities = apiResponse.entity.filter(i => i.tripUpdate ? true : false)

    // Filter to only valid South bound trips
    const tripUpdates = [];
    lineGroupTripEntities = tripUpdateEntities.filter(i => {
      if (!i.tripUpdate) return false;
      if (!i.tripUpdate.trip) return false;
      if (!i.tripUpdate.trip.routeId) return false;
      if (!i.tripUpdate.trip.tripId) return false;
      const tripId = i.tripUpdate.trip.tripId
      if (lineGroup.apiSuffix === "123456") {
        if (tripId[10] != "S") return false;
      } else {
        if (tripId.substring(tripId.length - 1) != "S") return false;
      }
      return false;
    });

    tripUpdates.push(lineGroupTripEntities);

    // Extract stopIds from tripUpdates with direction removed
    const updateStopIds = tripUpdates.map(updates => {
      return updates.map(update => {
        if (!update.tripUpdate) return null;
        if (!update.tripUpdate.stopTimeUpdate) return null;
        if (!update.tripUpdate.stopTimeUpdate[0]) return null;
        // remove direction from stopId string
        return update.tripUpdate.stopTimeUpdate.map(stationUpdate => stationUpdate.stopId.substring(0, stationUpdate.stopId.length - 1));
      });
    });

    // Loop through in pairs, see if interval already is present

    // If not add it

    // Current color:
    // lineGroups[lineGroup]

  } catch (error) {
    console.log("👺 makeLineList Error for line", lineGroup.lines.join(""), ":");
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ")
    console.log(error);
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ")
  }
}