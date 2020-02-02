const fs = require('fs');
const rp = require('request-promise');

const feedIds = require('./feeds.js');

// init sqlite db
const dbFile = __dirname + '/data/sqlite.db';
const exists = fs.existsSync(dbFile);
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);


(async function main() {

  db.serialize(() => {

    // Create db table if db didn't previously exist:
    if (!exists) {
      db.run(
        'CREATE TABLE WaitTimes (id INTEGER PRIMARY KEY AUTOINCREMENT, stopId TEXT, gTFSStopId TEXT, direction TEXT, seconds INTEGER, timestamp INTEGER, tripId TEXT, startDate TEXT, dayOfWeek INTEGER, line TEXT)'
      );
      console.log('New table WaitTimes created!');
    }
  });



  for (var m in feedIds) {
    feedId = feedIds[m];

    let stopUpdates = [];

    try {
      const feedResponse = await getFeedData(feedId);

      if (!feedResponse) {
        throw "Error getting feed data."
      }

      if (!feedResponse.header || !feedResponse.header.timestamp || !feedResponse.entity) {
        console.log("Feed Id:", feedId);
        console.log(feedResponse);
        throw "Feed data invalid."
      }

      console.log('Retrieved Feed at:', feedResponse.header.timestamp);

      const apiTime = parseInt(feedResponse.header.timestamp);
      const entity = feedResponse.entity;

      console.log('Logging', entity.length, 'train trips.');

      

      // Each item in entity is either a train trip
      // a trip is all the stops one train will make,
      // or information about a vehicle.
      for (var i in entity) {
        // Ignore train current status objects
        // Only need tripUpdate objects for determining stop spacing
        if (entity[i].tripUpdate) {
          const tripUpdate = entity[i].tripUpdate;
          const tripId = tripUpdate.trip.tripId;
          const startDate = tripUpdate.trip.startDate;
          const routeId = tripUpdate.trip.routeId;

          if (!tripUpdate.stopTimeUpdate) {
            // Vehicle information item, not useful for timing stops
            continue;
          }

          if(tripUpdate.stopTimeUpdate.length < 1) {
            // No stop timing information available
            // (could be start or end of the line).
            continue;
          }

          // Start index at 1 to ignore first datapoint
          for (var j = 1; j < tripUpdate.stopTimeUpdate.length; j++) {
            const update = tripUpdate.stopTimeUpdate[j];
            const previousUpdate = tripUpdate.stopTimeUpdate[j - 1];
            if (!update.arrival || !update.arrival.time) {
              console.log(`🧶 update ${j} has no arrival time.`);
              continue;
            }
            if (!previousUpdate.arrival || !previousUpdate.arrival.time) {
              console.log(`🧶 update ${j - 1} (previous) has no arrival time.`);
              continue;
            }
            if (!update.stopId) {
              console.log(`🧶 update ${j} has no stopId.`);
              continue;
            }

            const stopId = update.stopId;
            const gTFSStopId = stopId.substring(0, stopId.length - 1);
            const direction = stopId.substring(gTFSStopId.length, stopId.length);

            const seconds = parseInt(update.arrival.time) - parseInt(previousUpdate.arrival.time);

            stopUpdates.push({
              stopId: stopId,
              gTFSStopId: gTFSStopId,
              direction: direction,
              seconds: seconds,
              timestamp: apiTime,
              tripId: tripId,
              startDate: startDate,
              dayOfWeek: (new Date(apiTime * 1000)).getDay(),
              line: routeId
            })

          }
        }
      }
    } catch (error) {
      console.log("Error:");
      console.log(error);
    }

    for (var i in stopUpdates) {
      const wt = stopUpdates[i];
      db.serialize(() => {
        db.run(
          `INSERT INTO WaitTimes (stopId, gTFSStopId, direction, seconds, timestamp, tripId, startDate, dayOfWeek, line) VALUES ("${wt.stopId}", "${wt.gTFSStopId}", "${wt.direction}", "${wt.seconds}", "${wt.timestamp}", "${wt.tripId}", "${wt.startDate}", "${wt.dayOfWeek}", "${wt.line}")`
        );
      });

    }
  }
})();

async function getFeedData(feedId) {
  var options = {
    uri: `http://localhost:${process.env.PORT}/api/${feedId}`,
    json: true
  };

  console.log(options)

  try {
    const feedResponse = await rp(options);
    return feedResponse;
  } catch (error) {
    console.log("Error:");
    console.log(error);
    return {error: error}
  }
}


