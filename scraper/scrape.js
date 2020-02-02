const fs = require('fs');
const rp = require('request-promise');

// init sqlite db
const dbFile = __dirname + '/data/sqlite.db';
const exists = fs.existsSync(dbFile);
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

(async function main() {

  let stopUpdates = [];

  try {
    const feedResponse = await getFeedData();

    if (!feedResponse) {
      throw "Error getting feed data."
    }

    if (!feedResponse.header || !feedResponse.header.timestamp || !feedResponse.entity) {
      throw "Feed data invalid."
    }

    console.log('Retrieved Feed at:', feedResponse.header.timestamp);

    const apiTime = parseInt(feedResponse.header.timestamp);
    const entity = feedResponse.entity;

    console.log('Logging', entity.length, 'train trips.');

    


    for (var i in entity) {
      // A trip is all the stops one train will make

      // Ignore train current status objects
      // Only need tripUpdate objects for determining stop spacing
      if (entity[i].tripUpdate) {
        const tripUpdate = entity[i].tripUpdate;
        const tripId = tripUpdate.trip.tripId;
        const startDate = tripUpdate.trip.startDate;
        const routeId = tripUpdate.trip.routeId;

        if (!tripUpdate.stopTimeUpdate) {
          throw "tripUpdate has no stopTimeUpdate property."
        }

        if(tripUpdate.stopTimeUpdate.length < 1) {
          throw "tripUpdate.stopTimeUpdate is empty.";
        }

        // Start index at 1 to ignore first datapoint
        for (var j = 1; j < tripUpdate.stopTimeUpdate.length; j++) {
          const update = tripUpdate.stopTimeUpdate[j];
          if (!update.arrival || !update.arrival.time) {
            throw `update ${j} has no arrival time.`;
          }
          if (!update.stopId) {
            throw `update ${j} has no stopId.`;
          }

          const stopId = update.stopId;
          const gTFSStopId = stopId.substring(0, stopId.length - 1);
          const direction = stopId.substring(gTFSStopId.length, stopId.length);
          const seconds = parseInt(update.arrival.time) - apiTime;

          stopUpdates.push({
            stopId: stopId,
            gTFSStopId: gTFSStopId,
            direction: direction,
            seconds: seconds,
            timestamp: apiTime,
            tripId: tripId,
            startDate: startDate,
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
    console.log(stopUpdates[i].line, stopUpdates[i].seconds);
  }


  db.serialize(() => {

    // Create db table if db didn't previously exist:
    if (!exists) {
      db.run(
        'CREATE TABLE WaitTimes (id INTEGER PRIMARY KEY AUTOINCREMENT, stopId TEXT, gTFSStopId TEXT, direction TEXT, seconds INTEGER, timestamp INTEGER, tripId TEXT, startDate TEXT, line TEXT)'
      );
      console.log('New table WaitTimes created!');

      // insert default dreams
      db.serialize(() => {
        db.run(
          'INSERT INTO WaitTimes (stopId, gTFSStopId, direction, seconds, timestamp, tripId, startDate, line) VALUES ("108N", "108", "N", 141, 1580656844, "061250_1..N03R", "20200202", "1")'
        );
      });

      console.log('Database "WaitTimes" ready to go!');
    }

    db.each("SELECT * from WaitTimes", (err, row) => {
      if (row) {
        console.log(`StopId: ${row.gTFSStopId}, Direction: ${row.direction}, Timetamp: ${row.timestamp}, Seconds: ${row.seconds}. Line: ${row.line}`);
      }
    });

  });
})();

async function getFeedData() {
  var options = {
    uri: `http://localhost:${process.env.PORT}/api/all`,
    json: true
  };

  try {
    const feedResponse = await rp(options);
    return feedResponse;
  } catch (error) {
    console.log("Error:");
    console.log(error);
    return {error: error}
  }
}


