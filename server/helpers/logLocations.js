fs = require("fs");

module.exports = function (apiResponse) {
  // Log data to figure out time between stops

  const filename = "./.data/logs/trips.csv";

  if (!apiResponse) {
    return;
  }

  let timestamp = "Unknown"
  if (apiResponse.header && apiResponse.header.timestamp) {
    timestamp = apiResponse.header.timestamp;
  }

  const headers = "Timestamp, Entity Id, Type, TU Trip Id, TU Start Time, TU Start Date, TU Route Id, TU Stop Time Updates Count, TU STU0 Arrival, TU STU0 Departure, TU STU0 Stop Id, TU STU1 Arrival, TU STU1 Departure, TU STU1 Stop Id, V Trip Id, V Start Time, V Start Date, V Route Id, V Current Stop Sequence, V Timestamp, V Stop Id,\n"

  try {
    if (fs.existsSync(filename)) {
    } else {
      try {
        fs.appendFile(filename, headers, function (err) {
          if (err) throw err;
          console.log('Saved Headers');
        });
      } catch (error) {
        console.log("Error adding headers:", error);
      }
    }
  } catch(err) {
    console.log(err)
  }

  if (apiResponse.entity && apiResponse.entity[0]) {
    const rows = apiResponse.entity.map(e => {
      const type = e.tripUpdate ? "Trip Update" : e.vehicle ? "Vehicle" : "Unknown";
      let row = `${timestamp}, ${e.id}, ${type}, `

      if (type === "Trip Update") {
        const tu = e.tripUpdate
        row += `${tu.trip.tripId}, ${tu.trip.startTime}, ${tu.trip.startDate}, ${tu.trip.routeId}, ${tu.stopTimeUpdate.length},`

        if (tu.stopTimeUpdate[0]) {
          row += `${tu.stopTimeUpdate[0].arrival.time}, ${tu.stopTimeUpdate[0].departure.time}, ${tu.stopTimeUpdate[0].stopId},`
        } else {
          row += ", , ,"
        }

        if (tu.stopTimeUpdate[1]) {
          row += `${tu.stopTimeUpdate[1].arrival.time}, ${tu.stopTimeUpdate[1].departure.time}, ${tu.stopTimeUpdate[1].stopId}`
        } else {
          row += ", , ,"
        }

        row += ", , , , , , ,"
      } else if (type === "Vehicle") {
        const v = e.vehicle
        row += ", , , , , , , , , , , "
        row += `${v.trip.tripId}, ${v.trip.startTime}, ${v.trip.startDate}, ${v.trip.routeId}, ${v.currentStopSequence}, ${v.timestamp}, ${v.stopId}`
      } else {

      }

      return row;
    })

    const rowsString = rows.join("\n");

    fs.appendFile(filename, rowsString, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }

  else {
    if (!apiResponse.entity) {
      console.log("NO ENTITY")
    } else if (!apiResponse.entity[0]) {
      console.log("ENTITY BUT EMPTY")
    }
  }

  /*
  fs.writeFile(filename, JSON.stringify(apiResponse), function (err) {
    if (err) return console.log("Error:\n", err);
    console.log("Data written to " + filename);
  });
  */
};
