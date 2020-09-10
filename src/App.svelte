<script>
  // Import classes
  import Station from "./classes/Station.js";
  import TripEntity from "./classes/TripEntity.js";

  // Import helpers
  import api from "./helpers/api.js";
  import mergeTripUpdateAndVehicleEntities from "./helpers/mergeTripUpdateAndVehicleEntities.js";
  import stationHelpers from "./helpers/stationHelpers.js";
  import leaflet from "./helpers/leaflet.js";
  import lineGroups from "./helpers/lineGroups.js";

  // Initialize variables
  var tripEntities = []; // Most recent API response
  const trainsArray = []; // Array of Train objects
  let routes = [];

  // UPDATE_FREQUENCY_IN_SECONDS is set in /config.js
  const updateFreqency = parseInt(UPDATE_FREQUENCY_IN_SECONDS) * 1000;

  const routeData = lineGroups.flatMap(lineGroup => {
    return lineGroup.lines.map(line => {
      return {
        line: line,
        color: lineGroup.color,
      }
    });
  });

  // Station data is hard coded
  // See ./data/stationData.js, which is generated from tools/stationData.csv
  // 🚸 Currently limiting scope to the G line.
  routes = routeData.map(i => {
    return {
      stops: stationHelpers.getLineStops(i.line),
      color: i.color,
    }
  });

  (async function main() {
    // Draw the map
    leaflet.drawMap();

    // Parse station data:
    parseStations(); // 🚸 Empty right now
    // Draw all the stations for each route
    routes.forEach(i => drawStations(i.stops, i.color));

    drawLoop();
    setInterval(drawLoop, updateFreqency);

  })();



  // This function will be run every UPDATE_FREQUENCY_IN_SECONDS seconds
  async function drawLoop() {

    const lineGroup = lineGroups[0];

    // Get data from API
    tripEntities = await api.getMtaFeed(lineGroup.apiSuffix);
    //console.log(JSON.stringify(tripEntities))

    // Combine TripUpdate and Vehicle data:
    const combinedTripEntities = mergeTripUpdateAndVehicleEntities(tripEntities);

    console.log(`${tripEntities.length} entities becomes data for ${combinedTripEntities.length} trains`)
    
    // Validate data and create TripEntity objects
    const tripEntityObjects = combinedTripEntities.map((i, index) => new TripEntity(i, index));
    console.log(`Found ${tripEntityObjects.length} trip entity objects.`)

    // 🚸 Only use "Current" type trips for map
    const currentTrips = tripEntityObjects.filter(i => i.type === "Current");
    console.log(`of those ${currentTrips.length} are current`);
    //Draw each train at its updated position on the map
    drawEachTrain(currentTrips);
  }

  // Draw each train on map
  function drawEachTrain(currentTrips) {
    console.log("🧮 Received data for", currentTrips.length, "trains", "(", currentTrips.map(i => i.index), ")")
    
    for (var i in currentTrips) {
      let trainUpdate = currentTrips[i];
      try {
        
        let trainObject = trainUpdate.createTrainOrFindTrainIn(trainsArray);

        // 🚸 What are the cases that cause this?
        if (!trainObject) {
          throw "Can't parse train at index " + i;
        }

        trainObject.locate()

        if (!trainObject.marker) {
          // New train is drawn on map:
          trainObject.marker = leaflet.drawTrain(trainObject);
          trainsArray.push(trainObject);

        } else {
          // Existing train is moved if lat or long has changed: 
          if (trainObject.move) {
            trainObject.move = false;
            leaflet.moveTrain(trainObject);
          }
        }
        
      } catch (error) {
        console.log("Error:", error);
      }
    }
  }

  function parseStations() {
    //🚸 Empty right now
  }

  function drawStations(routeStops, color) {
    let prevStation = null;
    for (let i = 0; i < routeStops.length; i++) {

      // Create station object
      const station = routeStops[i];

      // Draw station on map
      leaflet.drawStation(station);

      // Connect new station to previous station:
      if (prevStation) {
        leaflet.drawTracks(prevStation, station, color);
      }

      prevStation = station;
    }
  }

</script>

<style>

</style>