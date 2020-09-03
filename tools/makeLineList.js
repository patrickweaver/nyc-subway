require('dotenv').config();
const fs = require("fs");
const getFeed = require("../server/helpers/getFeed.js");
const mergeTripUpdateAndVehicleEntities = require("./mergeTripUpdateAndVehicleEntities.js");

var lines = require("./lines.js");

const lineGroups = [
  {
    lines: ["A", "C", "E"],
    apiSuffix: "ace",
    color: "Blue",
  },
  {
    lines: ["B", "D", "F", "M"],
    apiSuffix: "bdfm",
    color: "Orange",
  },
  {
    lines: ["G"],
    apiSuffix: "g",
    color: "LightGreen",
  },
  {
    lines: ["J", "Z"],
    apiSuffix: "jz",
    color: "Brown",
  },
  {
    lines: ["N", "Q", "R", "W"],
    apiSuffix: "nqrw",
    color: "Yellow",
  },
  {
    lines: ["L"],
    apiSuffix: "l",
    color: "DarkGrey",
  },
  {
    lines: ["1", "2", "3", "4", "5", "6", "GS"],
    apiSuffix: "123456", // Not actually the suffix
    color: "Red",
  },
  {
    lines: ["7"],
    apiSuffix: "7",
    color: "Purple",
  },
  {
    lines: ["SIR"],
    apiSuffix: "si",
    color: "SteelBlue",
  }
]

main();
setInterval(main, 1000 * 60 * 5);

async function main() {

  for (lineGroup of lineGroups) {
    await getLineGroup(lineGroup);
  }

  try {
    const linesCopy = `// A list of station Ids, this is the same as /src/data/lines.js

    module.exports = `

    const filename = "./tools/lines.js";
    fs.writeFile(filename, linesCopy + JSON.stringify(lines), function (err) {
      if (err) return console.log("Error:\n", err);
      console.log(`stop ID line data written to ${filename}`);
    });
  } catch (error) {
    console.log("Error writing file")
  }
}

async function getLineGroup(lineGroup) {
  //console.log("👅 getting:", lineGroup.lines.join(""), lineGroup.apiSuffix);
  try {
    const apiResponse = await getFeed(lineGroup.apiSuffix);

    //console.log("🗣 ENTITIES COUNT", apiResponse.entity.length);

    const tripUpdateEntities = apiResponse.entity.filter(i => {
      if (i.tripUpdate) {
        return true;
      }

      return false;
    });

    const tripUpdatesByLine = [];
    lineGroup.lines.forEach(line => {
      lineTripEntities = tripUpdateEntities.filter(i => {
        if (!i.tripUpdate) return false;
        if (!i.tripUpdate.trip) return false;
        if (!i.tripUpdate.trip.routeId) return false;
        if (!i.tripUpdate.trip.tripId) return false;

        if (lineGroup.apiSuffix === "123456") {
          if (i.tripUpdate.trip.tripId[10] != "S") return false;
        } else {
          if (i.tripUpdate.trip.tripId.substring(i.tripUpdate.trip.tripId.length - 1) != "S") return false;
        }

        if (i.tripUpdate.trip.routeId.toLowerCase() === line.toLowerCase()) {
          return true;
        }
        
        return false;
      });

      tripUpdatesByLine.push(lineTripEntities);
    });

    const updateStopIds = tripUpdatesByLine.map(lineUpdates => {
      return lineUpdates.map(update => {
        if (!update.tripUpdate) return null;
        if (!update.tripUpdate.stopTimeUpdate) return null;
        if (!update.tripUpdate.stopTimeUpdate[0]) return null;

        return update.tripUpdate.stopTimeUpdate.map(stationUpdate => stationUpdate.stopId.substring(0, stationUpdate.stopId.length - 1));
      });
    });

    lineGroup.lines.forEach((line, index) => {
      const lineStopIdsUpdates = updateStopIds[index];
      let longestIndex = 0;
      let longestLength = 0;
      lineStopIdsUpdates.forEach((i, index) => {
        if (!i) return;
        if (i.length > longestLength) {
          longestIndex = index;
          longestLength = i.length;
        }
      })


      if (longestLength > 0 && (!lines[line] || lines[line].length < longestLength)) {
        console.log("🐙 Found more for", line, ":", longestLength, "(used to be", lines[line] ? lines[line].length : "empty", ") at", (new Date()).getHours(), ":", (new Date()).getMinutes());
        lines[line] = lineStopIdsUpdates[longestIndex];
      } else {
        //console.log("🌫 ", line, "still at:", lines[line] ? lines[line].length : longestLength);
      }
    });

  } catch (error) {
    console.log("👺 makeLineList Error for line", lineGroup.lines.join(""), ":");
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ")
    console.log(error);
    console.log("💋  💋  💋  💋  💋  💋  💋  💋  ")
  }
}