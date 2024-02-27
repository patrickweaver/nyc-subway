import fs from "fs";
import shapes from "./shapes.js";
import lineGroupIntervals from "./lineGroupIntervals.js";
import stationData from "../stationData.js";
import lineGroups from "../lineGroups.js";

try {
  const intervalShapes = {};

  const stations = {};
  stationData.forEach((station) => {
    stations[station["GTFS Stop ID"]] = {
      name: station["Stop Name"],
      lat: station["GTFS Latitude"],
      lng: station["GTFS Longitude"],
    };
  });

  const lineColors = {};
  lineGroups.forEach((i) => {
    i.lines.forEach((lineId) => {
      lineColors[lineId] = i.color;
    });
  });

  const stringShapes = {};
  for (let line in shapes) {
    stringShapes[line] = {};
    for (let lineVer in shapes[line]) {
      const shapeArray = shapes[line][lineVer];
      const stringShapeArray = shapeArray.map((i) => {
        const iLat = String(i[0]).padEnd(10, "0");
        const iLng = String(i[1]).padEnd(11, "0");
        return `${iLat}__${iLng}`;
      });
      stringShapes[line][lineVer] = stringShapeArray;
    }
  }

  // This will be very inefficient ¯\_(ツ)_/¯
  for (let color in lineGroupIntervals) {
    const intervals = lineGroupIntervals[color];
    intervals.forEach((interval, index) => {
      const s1 = stations[interval[0]];
      const s2 = stations[interval[1]];

      const s1Lat = String(s1.lat).padEnd(10, "0");
      const s1Lng = String(s1.lng).padEnd(11, "0");
      const s2Lat = String(s2.lat).padEnd(10, "0");
      const s2Lng = String(s2.lng).padEnd(11, "0");

      s1pos = `${s1Lat}__${s1Lng}`;
      s2pos = `${s2Lat}__${s2Lng}`;

      const currIntervalShapesStrs = [];
      const currIntervalShapes = [];
      lineGroupIntervals[color][index].push([]);

      for (let line in shapes) {
        // 🧱 Loop through only lines that are the right color
        if (lineColors[line] === color) {
          // loop through that

          for (lineVar in shapes[line]) {
            if (lineVar[3] === "S") {
              const strShapeArr = stringShapes[line][lineVar];
              const s1Ind = strShapeArr.indexOf(s1pos);
              const s2Ind = strShapeArr.indexOf(s2pos);
              if (s1Ind > -1 && s2Ind > -1) {
                //console.log(lineVar, s1Ind, s2Ind);
                const shapeString = strShapeArr
                  .slice(s1Ind, s2Ind + 1)
                  .join(" ||| ");
                const shapeStringRev = strShapeArr
                  .slice(s2Ind, s1Ind + 1)
                  .reverse()
                  .join(" ||| ");
                if (
                  currIntervalShapesStrs.indexOf(shapeString) === -1 &&
                  currIntervalShapesStrs.indexOf(shapeStringRev) === -1
                ) {
                  currIntervalShapesStrs.push(shapeString);
                  currIntervalShapes.push(
                    shapes[line][lineVar].slice(s1Ind, s2Ind + 1),
                  );
                }
              }
            }
          }
        }
      }
      // if (currIntervalShapesStrs.length > 1) {
      //   console.log("****", s1.name, "->", s2.name)
      //   console.log(currIntervalShapesStrs.length)
      //   for (s in currIntervalShapesStrs) {
      //     console.log("\\/ \\/ \\/ \\/ \\/ \\/ \\/ \\/ \\/")
      //     console.log(currIntervalShapesStrs[s].length)
      //     console.log("🔦" + currIntervalShapesStrs[s] + "🔦", "\n")
      //     console.log("^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^")
      //     //🧱 save longest shape
      //   }
      // }
      for (let s in currIntervalShapes) {
        if (
          currIntervalShapes[s].length >
          lineGroupIntervals[color][index][4].length
        ) {
          lineGroupIntervals[color][index][4] = currIntervalShapes[s];
        }
      }
    });
  }

  const intervalShapesCopy = `// Parsed data from shapes.txt file from GTFS download
  // and logged (and cleaned up) intervals from stopTimeUpdates

  export default `;

  const filename = "./tools/intervalShapes/intervalShapes.js";
  fs.writeFile(
    filename,
    intervalShapesCopy + JSON.stringify(lineGroupIntervals),
    function (err) {
      if (err) return console.log("Error:\n", err);
      console.log(`Interval shapes file updated.`);
    },
  );
} catch (error) {
  console.log("Error writing file\n", error);
}
