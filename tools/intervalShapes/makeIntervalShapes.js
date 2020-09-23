const fs = require("fs");
const shapes = require("./shapes.js");
const lineGroupIntervals = require("./lineGroupIntervals.js");
const stationData = require("../stationData.js");
const lineGroups = require("../lineGroups.js");

try {

  const intervalShapes = {}

  const stations = {};
  stationData.forEach(station => {
    stations[station["GTFS Stop ID"]] = {
      name: station["Stop Name"],
      lat: station["GTFS Latitude"],
      lng: station["GTFS Longitude"]
    }
  })

  const lineColors = {};
  lineGroups.forEach(i => {
    i.forEach(lineId => {
      lineColors[lineId] = i.color;
    })
  })

  const stringShapes = {};
  for (let line in shapes) {
    stringShapes[line] = {};
    for (let lineVer in shapes[line]) {
      const shapeArray = shapes[line][lineVer];
      const stringShapeArray = shapeArray.map(i => `${i[0]}__${i[1]}`);
      stringShapes[line][lineVer] = stringShapeArray;
    }
  }

  // This will be very inefficient ¯\_(ツ)_/¯ 
  for (let color in lineGroupIntervals) {
    const intervals = lineGroupIntervals[color]
    intervals.forEach(interval => {
      const s1 = stations[interval[0]];
      const s2 = stations[interval[1]];
      s1pos = `${s1.lat}__${s1.lng}`;
      s2pos = `${s2.lat}__${s2.lng}`;

      for (let line in shapes) {

          // 🧱 Loop through only lines that are the right color
      }
    })
  }


  const intervalShapesCopy = `// Parsed data from shapes.txt file from GTFS download
  // and logged (and cleaned up) intervals from stopTimeUpdates

  module.exports = `

  const filename = "./tools/intervalShapes/intervalShapes.js";
  fs.writeFile(filename, intervalShapesCopy + JSON.stringify(intervalShapes), function (err) {
    if (err) return console.log("Error:\n", err);
    console.log(`Interval shapes file updated.`);
  });
} catch (error) {
  console.log("Error writing file\n", error)
}