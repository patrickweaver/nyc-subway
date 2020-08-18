<script>
  import L from 'leaflet';
  import * as leafletMarkerSlideTo from 'leaflet.marker.slideto';

  // Import External Dependencies
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  // Import classes
  import TripEntity from "./classes/TripEntity.js";

  // Import helpers
  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import lines from './helpers/lines.js';
  import leaflet from "./helpers/leaflet.js";
  import parseCurrentTrips from "./helpers/parseCurrentTrips";

  // Initialize variables
  let tripEntities = []; // Most recent API response
  let trainsArray = []; // Array of Train objects
  let apiTime = (new Date()).getTime(); // Local server time gets overwritten with timestamp from API.
  let map; // Map var for leaflet

  const updateFreqency = UPDATE_FREQUENCY_IN_SECONDS // seconds
  * 1000;
  
  // Station data is hard coded
  // See stationData.js, which is generated form stationData.csv
  // 🚸 Currently limiting scope to the G line.
  let gStops = stations.getLineStops('G');

  // This function will be run every 🚸(?) 10 seconds
  async function drawLoop() {
    // Get data from API, parse data, draw train data on map
    ( { tripEntities, apiTime } = await api.getMtaFeed() )

    // 🔇 console.log(tripEntities);

    const tripEntityObjects = tripEntities.map((i, index) => new TripEntity(i, index, apiTime));

    // 🔇 console.log(tripEntityObjects);

    const currentTrips = tripEntityObjects.filter(i => i.type === "Current");

    console.log("🎛 NUMBER OF CURRENT TRIPS:", currentTrips.length, "of", tripEntityObjects.length)

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
        ( { trainObject, newTrain } = parseCurrentTrips(trainUpdate, trainsArray) );

        if (trainObject) {

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
        
        } else {
          //throw "Can't parse train at index " + i;
        }
        
      } catch (error) {
        console.log("Error:");
        console.log(error);
      }
    }
  }

  (async function main() {
    // Draw the map
    map = leaflet.drawMap();
    // Draw all the stations
    for (let i = 0; i < gStops.length; i++) {
      let station = {
        lat: gStops[i]['GTFS Latitude'],
        long: gStops[i]['GTFS Longitude']
      }
      leaflet.drawStation(station, false);
      if (gStops[i + 1]) {
        leaflet.drawLine(station, {
          lat: gStops[i + 1]['GTFS Latitude'],
          long: gStops[i + 1]['GTFS Longitude']
        })
      }
    }

    drawLoop();
    setInterval(drawLoop, updateFreqency);

  })();
</script>

<style>

</style>