<script>
  import L from 'leaflet';
  import * as leafletMarkerSlideTo from 'leaflet.marker.slideto';

  // Import External Dependencies
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  // Import classes
  import Station from "./classes/Station.js";
  import TripEntity from "./classes/TripEntity.js";

  // Import helpers
  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import lines from './helpers/lines.js';
  import leaflet from "./helpers/leaflet.js";
  import parseTripEntity from "./helpers/parseTripEntity";

  // Initialize variables
  let tripEntities = []; // Most recent API response
  let trainsArray = []; // Array of Train objects
  let apiTime = (new Date()).getTime(); // Local server time gets overwritten with timestamp from API.
  let map; // Map var for leaflet

  const updateFreqency = UPDATE_FREQUENCY_IN_SECONDS * 1000;

  // Station data is hard coded
  // See stationData.js, which is generated form tools/stationData.csv
  // 🚸 Currently limiting scope to the G line.
  let gStops = stations.getLineStops('G');

  // This function will be run every 🚸(?) 10 seconds
  async function drawLoop() {
    // Get data from API
    ( { tripEntities, apiTime } = await api.getMtaFeed() )

    // Validate data and create TripEntity objects
    const tripEntityObjects = tripEntities.map((i, index) => new TripEntity(i, index, apiTime));

    // 🚸 Only use "Current" type trips for map
    const currentTrips = tripEntityObjects.filter(i => i.type === "Current");

    //Draw each train at its updated position on the map
    drawEachTrain(currentTrips);
  }

  // Draw each train on map
  function drawEachTrain(currentTrips) {
    console.log("⏰ Updating Train Positions at", apiTime);
    console.log('🧮 Received data for', currentTrips.length, 'trains')
    
    for (var i in currentTrips) {
      let trainUpdate = currentTrips[i];
      try {
        
        let trainObject, newTrain;
        ( { trainObject, newTrain } = parseTripEntity(trainUpdate, trainsArray) );

        // 🚸 What are the cases that cause this?
        if (!trainObject) {
          throw "Can't parse train at index " + i;
        }

        if (newTrain) {
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

  (async function main() {
    // Draw the map
    map = leaflet.drawMap();

    // Draw all the stations
    let prevStation = null;
    for (let i = 0; i < gStops.length; i++) {

      // Create station object
      const s = gStops[i];
      const station = new Station(s["GTFS Stop ID"], s["GTFS Latitude"], s["GTFS Longitude"]);

      // Draw station on map
      leaflet.drawStation(station);

      // Connect new station to previous station:
      if (prevStation) {
        leaflet.drawLine(prevStation, station);
      }
      prevStation = station;
    }

    drawLoop();
    setInterval(drawLoop, updateFreqency);

  })();
</script>

<style>

</style>