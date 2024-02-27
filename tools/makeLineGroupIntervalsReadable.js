require("dotenv").config();
import fs from "fs";

var lineGroupIntervals = require("./lineGroupIntervals.js");

import lineGroups from "./lineGroups.js";
import stationData from "./stationData.js";
const stationIds = {};
stationData.forEach((i, index) => {
  stationIds[i["GTFS Stop ID"]] = index;
});

main();

async function main() {
  for (let color in lineGroupIntervals) {
    lineGroupIntervals[color].forEach((interval) => {
      const station0 = stationData[stationIds[interval[0]]];
      let descriptor0 = `Unknown station ${color}`;
      if (station0) {
        const stopName0 = station0["Stop Name"];
        const routes0 = station0["Daytime Routes"];
        descriptor0 = `${stopName0} (${routes0})`;
      }
      let descriptor1 = `Unknown station ${color}`;
      const station1 = stationData[stationIds[interval[1]]];
      if (station1) {
        const stopName1 = station1["Stop Name"];
        const routes1 = station1["Daytime Routes"];
        descriptor1 = `${stopName1} (${routes1})`;
      }
      interval.push(descriptor0, descriptor1);
    });
  }

  try {
    const lineGroupIntervalsReadableCopy = `// A list of pairs of stationIds, this is the same as /src/data/lineGroupIntervals.js

    export default `;

    const filename = "./tools/lineGroupIntervalsReadable.js";
    fs.writeFile(
      filename,
      lineGroupIntervalsReadableCopy + JSON.stringify(lineGroupIntervals),
      function (err) {
        if (err) return console.log("Error:\n", err);
        console.log(`stop ID line data written to ${filename}`);
      },
    );
  } catch (error) {
    console.log("Error writing file");
  }
}
