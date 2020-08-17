<script>
  import L from 'leaflet';
  import * as leafletMarkerSlideTo from 'leaflet.marker.slideto';

  // Import External Dependencies
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  // Import helpers
  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import lines from './helpers/lines.js';
  import leaflet from "./helpers/leaflet.js";
  import parseTrainUpdate from "./helpers/parseTrainUpdate";

  // Initialize variables
  let trainData = []; // Most recent API response
  let trainsArray = []; // Array of Train objects
  let apiTime = (new Date()).getTime(); // Local server time gets overwritten with timestamp from API.
  let map; // Map var for leaflet
  
  // Station data is hard coded
  // See stationData.js, which is generated form stationData.csv
  // 🚸 Currently limiting scope to the G line.
  let gStops = stations.getLineStops('G');

  // This function will be run every 🚸(?) 10 seconds
  async function drawLoop() {
    // Get data from API, parse data, draw train data on map
    ( { trainData, apiTime } = await api.getMtaFeed() )

    //Draw each train at its updated position on the map
    drawEachTrain(trainData);
  }

  // Draw each train on map
  function drawEachTrain(trainUpdates) {
    console.log("⏰ Updating Train Positions at", apiTime);
    console.log('🧮 Received data for', trainUpdates.length, 'trains')
    
    for (var i in trainUpdates) {
      let trainUpdate = trainUpdates[i];
      //console.log(i, "Train Data:");
      //console.log(trainUpdate);

      // Check for a whole bunch of stuff in the JSON
      // The API response has lots of objects that don't
      // represent trains currently between stations.
      // Objects that have all of the following are trains
      // that we can draw.
      try {
        
        let trainObject, newTrain;
        ( { trainObject, newTrain } = parseTrainUpdate(trainUpdate, i, trainsArray) );

        if (trainObject) {

          if (newTrain) {
            console.log(i, "New Train:", trainObject.id)
            // New train is drawn on map:
            trainObject.marker = leaflet.drawTrain(trainObject);
            trainsArray.push(trainObject);

          } else {
            console.log(i, "Moving Train:", trainObject.id)
            // Existing train is moved if lat or long has changed: 
            if (trainObject.latitude !== trainLat || trainObject.longitude !== trainLong) {
              trainObject.latitude = trainLat;
              trainObject.longitude = trainLong;
              leaflet.moveTrain(trainObject);
            }
          }
        
        } else {
          throw "Can't parse train at index " + i;
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
    setInterval(drawLoop, 5000);

  })();
</script>

<style>

</style>