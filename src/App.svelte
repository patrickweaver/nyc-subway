<script>
  // Import classes
  import Station from "./classes/Station.js";
  import TripEntity from "./classes/TripEntity.js";

  // Import helpers
  import api from "./helpers/api.js";
  import mergeTripUpdateAndVehicleEntities from "./helpers/mergeTripUpdateAndVehicleEntities.js";
  import stationHelpers from "./helpers/stationHelpers.js";
  import leaflet from "./helpers/leaflet.js";

  // Initialize variables
  const tripEntities = []; // Most recent API response
  const trainsArray = []; // Array of Train objects
  let routes = [];

  // UPDATE_FREQUENCY_IN_SECONDS is set in /config.js
  const updateFreqency = parseInt(UPDATE_FREQUENCY_IN_SECONDS) * 1000;

  const routeIds = ["l", "g", "a"];

  // Station data is hard coded
  // See ./data/stationData.js, which is generated from tools/stationData.csv
  // 🚸 Currently limiting scope to the G line.
  routes = routeIds.map(i => stationHelpers.getLineStops(i));

  (async function main() {
    // Draw the map
    leaflet.drawMap();

    // Parse station data:
    parseStations();

    // Draw all the stations
    routes.forEach(i => drawStations(i));

    drawLoop();
    setInterval(drawLoop, updateFreqency);

  })();



  // This function will be run every UPDATE_FREQUENCY_IN_SECONDS seconds
  async function drawLoop() {
    // Get data from API
    tripEntities = await api.getMtaFeed(route)

    //console.log(JSON.stringify(tripEntities));

    // Combine TripUpdate and Vehicle data:
    const combinedTripEntities = mergeTripUpdateAndVehicleEntities(tripEntities);
    
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

  }

  function drawStations(routeStops) {
    let prevStation = null;
    for (let i = 0; i < routeStops.length; i++) {

      // Create station object
      const station = routeStops[i];

      // Draw station on map
      leaflet.drawStation(station);

      // Connect new station to previous station:
      if (prevStation) {
        leaflet.drawTracks(prevStation, station);
      }

      prevStation = station;
    }
  }

</script>

<style>

</style>