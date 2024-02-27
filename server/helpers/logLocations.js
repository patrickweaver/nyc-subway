import fs from "fs";
import { timestampFromDateAndTime } from "./timestampFromDateAndTime.js";

export function logLocations(apiResponse) {
  // Log data to figure out time between stops

  if (!apiResponse) {
    return;
  }

  const tripsFilename = "./.data/logs/trips.csv";
  const stuFilename = "./.data/logs/stopTimeUpdates.csv";

  let timestamp = "Unknown";
  if (apiResponse.header && apiResponse.header.timestamp) {
    timestamp = parseInt(apiResponse.header.timestamp);
  }

  const tripsHeaders =
    "Timestamp, Entity Id, Type, TU Trip Id, TU Start Time, TU Start Date, TU Route Id, TU Start Timestamp, TU Index, TU Stop Time Updates Count, TU STU0 Arrival, TU STU0 Departure, TU STU0 Stop Id, TU STU1 Arrival, TU STU1 Departure, TU STU1 Stop Id, V Trip Id, V Start Time, V Start Date, V Route Id, V Current Stop Sequence, V Timestamp, V Stop Id,\n";

  const stuHeaders =
    "timestamp, entityId, type, tripId, startTime, startDate, routeId, startTimestamp, entityIndex, entityCount, stuIndex, stuCount, arrival, arrivalOffset, departure, departureOffset, stopId,\n";

  // Add headers to trip file if file doesn't exist
  try {
    if (fs.existsSync(tripsFilename)) {
    } else {
      try {
        fs.appendFile(tripsFilename, tripsHeaders, function (err) {
          if (err) throw err;
          console.log("Saved trip headers");
        });
      } catch (error) {
        console.log("Error adding trip headers:", error);
      }
    }
  } catch (err) {
    console.log(err);
  }

  // Add headers to STU file if file doesn't exist
  try {
    if (fs.existsSync(stuFilename)) {
    } else {
      try {
        fs.appendFile(stuFilename, stuHeaders, function (err) {
          if (err) throw err;
          console.log("Saved stop time update headers");
        });
      } catch (error) {
        console.log("Error adding stop time update headers:", error);
      }
    }
  } catch (err) {
    console.log(err);
  }

  if (apiResponse.entity && apiResponse.entity[0]) {
    let tripRows = "";
    let newStuRows = "";
    apiResponse.entity.forEach((e, index) => {
      const type = e.tripUpdate
        ? "Trip Update"
        : e.vehicle
          ? "Vehicle"
          : "Unknown";

      let tripRow = `${timestamp}, ${e.id}, ${type}, `;
      let stuMetaRow = `${timestamp}, ${e.id}, ${type}, `;

      if (type === "Trip Update") {
        const tu = e.tripUpdate;
        const startTimestamp = timestampFromDateAndTime(
          tu.trip.startDate,
          tu.trip.startTime,
        );
        tripRow += `${tu.trip.tripId}, ${tu.trip.startTime}, ${tu.trip.startDate}, ${tu.trip.routeId}, ${startTimestamp}, ${index}, ${apiResponse.entity.length}, `;
        stuMetaRow += `${tu.trip.tripId}, ${tu.trip.startTime}, ${tu.trip.startDate}, ${tu.trip.routeId}, ${startTimestamp}, ${index}, ${apiResponse.entity.length}, `;

        if (tu.stopTimeUpdate[0]) {
          tripRow += `${tu.stopTimeUpdate[0].arrival.time}, ${tu.stopTimeUpdate[0].departure.time}, ${tu.stopTimeUpdate[0].stopId},`;
        } else {
          tripRow += ", , , ";
        }

        if (tu.stopTimeUpdate[1]) {
          tripRow += `${tu.stopTimeUpdate[1].arrival.time}, ${tu.stopTimeUpdate[1].departure.time}, ${tu.stopTimeUpdate[1].stopId}`;
        } else {
          tripRow += ", , , ";
        }

        tripRow += ", , , , , , , ";

        // Log all STUs as rows
        const stuCount = tu.stopTimeUpdate.length;
        for (let i in tu.stopTimeUpdate) {
          const stu = tu.stopTimeUpdate[i];
          let stuRow =
            stuMetaRow +
            `${i}, ${stuCount}, ${stu.arrival.time}, ${
              parseInt(stu.arrival.time) - timestamp
            }, ${stu.departure.time}, ${
              parseInt(stu.departure.time) - timestamp
            }, ${stu.stopId},\n`;
          newStuRows += stuRow;
        }
      } else if (type === "Vehicle") {
        const v = e.vehicle;
        tripRow += ", , , , , , , , , , , , , ";
        tripRow += `${v.trip.tripId}, ${v.trip.startTime}, ${v.trip.startDate}, ${v.trip.routeId}, ${v.currentStopSequence}, ${v.timestamp}, ${v.stopId}`;
      } else {
      }

      tripRows += tripRow + "\n";
    });

    fs.appendFile(tripsFilename, tripRows, function (err) {
      if (err) throw err;
      console.log("Saved new trips! at ", new Date());
    });

    fs.appendFile(stuFilename, newStuRows, function (err) {
      if (err) throw err;
      console.log("Saved new stop time updates");
    });
  } else {
    if (!apiResponse.entity) {
      console.log("NO ENTITY");
    } else if (!apiResponse.entity[0]) {
      console.log("ENTITY BUT EMPTY");
    }
  }

  /*
  fs.writeFile(filename, JSON.stringify(apiResponse), function (err) {
    if (err) return console.log("Error:\n", err);
    console.log("Data written to " + filename);
  });
  */
}
