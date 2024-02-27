const fs = require("fs");

const tripsCsvFilePath = "./.data/logs/trips.csv";
const csv = require("csvtojson");
const lines = require("./lines.js");
const saveFilePath = "./src/data/stationWaitTimes.js";

let avg = (array) => Math.round(array.reduce((a, b) => a + b) / array.length);
let max = (array) => Math.max(...array);

main();

async function main() {
  console.log(lines);

  const jsonTrips = await csv().fromFile(tripsCsvFilePath);
  //const jsonStations = await csv().fromFile(stationsCsvFilePath);

  const allLinesWaitTimes = {};

  for (let i in lines) {
    const lineWaitTimes = {};
    const line = lines[i];
    line.forEach((stop, index) => {
      const stopWaitTimes = {
        N: null,
        S: null,
      };
      nStation = line[index - 1];
      sStation = line[index + 1];

      if (sStation) {
        stopWaitTimes.n = getWaitTimes(sStation, "N", i, jsonTrips);
      }

      if (nStation) {
        stopWaitTimes.s = getWaitTimes(nStation, "S", i, jsonTrips);
      }

      lineWaitTimes[stop] = stopWaitTimes;
    });

    allLinesWaitTimes[i] = lineWaitTimes;
  }

  console.log(JSON.stringify(allLinesWaitTimes));

  const data = new Uint8Array(
    Buffer.from("export default " + JSON.stringify(allLinesWaitTimes)),
  );
  fs.writeFile(saveFilePath, data, (err) => {
    if (err) throw err;
    console.log("The file has been saved!");
  });
}

function getWaitTimes(stopId, direction, route, trips) {
  const stopArray = trips
    .filter((i) => {
      if (i.Type != "Trip Update") {
        return false;
      }

      const tripId = i["TU Trip Id"];
      const tripDirection = tripId.substring(tripId.length - 1, tripId.length);

      if (
        i["TU Route Id"] === route &&
        i["TU STU0 Stop Id"].substring(0, 3) === stopId &&
        i["TU STU0 Stop Id"].substring(3, 4) === direction &&
        tripDirection === direction &&
        i["TU STU0 Arrival"] &&
        i["TU STU1 Arrival"] > i["TU STU0 Arrival"]
      ) {
        return i;
      } else {
        return false;
      }
    })
    .map((i) => {
      if (i["TU STU1 Arrival"] - i["TU STU0 Arrival"] < 0) {
        return [
          i["TU STU1 Arrival"],
          i["TU STU0 Arrival"],
          i["TU STU1 Arrival"] - i["TU STU0 Arrival"],
        ];
      }
      return i["TU STU1 Arrival"] - i["TU STU0 Arrival"];
    });

  return { avg: avg(stopArray), max: max(stopArray) };
}
