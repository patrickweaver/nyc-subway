require("dotenv").config();
import fs from "fs";
import getFeed from "../server/helpers/getFeed.js";
import mergeTripUpdateAndVehicleEntities from "./mergeTripUpdateAndVehicleEntities.js";

var lines = require("./lines.js");

import lineGroups from "./lineGroups.js";

main();
setInterval(main, 1000 * 60 * 5);

async function main() {
  for (lineGroup of lineGroups) {
    await getLineGroup(lineGroup);
  }

  try {
    const linesCopy = `// A list of station Ids, this is the same as /src/data/lines.js

    export default `;

    const filename = "./tools/lines.js";
    fs.writeFile(filename, linesCopy + JSON.stringify(lines), function (err) {
      if (err) return console.log("Error:\n", err);
      console.log(`stop ID line data written to ${filename}`);
    });
  } catch (error) {
    console.log("Error writing file");
  }
}

async function getLineGroup(lineGroup) {
  try {
    // Request line group data from API:
    const apiResponse = await getFeed(lineGroup.apiSuffix);
    // Filter to only entities with a tripUpdate property
    const tripUpdateEntities = apiResponse.entity.filter((i) =>
      i.tripUpdate ? true : false,
    );

    // Filter to only valid South bound trips for each line.
    const tripUpdatesByLine = [];
    lineGroup.lines.forEach((line) => {
      lineTripEntities = tripUpdateEntities.filter((i) => {
        if (!i.tripUpdate) return false;
        if (!i.tripUpdate.trip) return false;
        if (!i.tripUpdate.trip.routeId) return false;
        if (!i.tripUpdate.trip.tripId) return false;
        const tripId = i.tripUpdate.trip.tripId;
        let direction;
        if (!tripId.split("..")[1]) {
          // Sometimes there is one dot??
          direction = tripId.split(".")[1][0];
        } else {
          direction = tripId.split("..")[1][0];
        }
        if (direction != "S") return false;
        if (i.tripUpdate.trip.routeId.toLowerCase() === line.toLowerCase()) {
          return true;
        }
        return false;
      });

      tripUpdatesByLine.push(lineTripEntities);
    });

    // Extract stopIds from tripUpdatesByLine with direction removed
    const updateStopIds = tripUpdatesByLine.map((lineUpdates) => {
      return lineUpdates.map((update) => {
        if (!update.tripUpdate) return null;
        if (!update.tripUpdate.stopTimeUpdate) return null;
        if (!update.tripUpdate.stopTimeUpdate[0]) return null;
        // remove direction from stopId string
        return update.tripUpdate.stopTimeUpdate.map((stationUpdate) =>
          stationUpdate.stopId.substring(0, stationUpdate.stopId.length - 1),
        );
      });
    });

    // For each line in the group (color on map)
    lineGroup.lines.forEach((line, index) => {
      // Find entity with longest list of stopTimeUpdates
      const lineStopIdsUpdates = updateStopIds[index];
      let longestIndex = 0;
      let longestLength = 0;
      lineStopIdsUpdates.forEach((i, index) => {
        if (!i) return;
        if (i.length > longestLength) {
          longestIndex = index;
          longestLength = i.length;
        }
      });

      // If list of updates is longer (includes more stops) than what we had previously
      // then replace it.
      if (
        longestLength > 0 &&
        (!lines[line] || lines[line].length < longestLength)
      ) {
        console.log(
          "🐙 Found more for",
          line,
          ":",
          longestLength,
          "(used to be",
          lines[line] ? lines[line].length : "empty",
          ") at",
          new Date().getHours(),
          ":",
          new Date().getMinutes(),
        );
        lines[line] = lineStopIdsUpdates[longestIndex];
      }
    });
  } catch (error) {
    console.log(
      "👺 makeLineList Error for line",
      lineGroup.lines.join(""),
      ":",
    );
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ");
    console.log(error);
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ");
  }
}
