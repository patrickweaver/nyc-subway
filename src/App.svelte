<script>
  // Import classes
  import Station from "./classes/Station.js";
  import TripEntity from "./classes/TripEntity.js";
  import Interval from "./classes/Interval.js";

  // Import hard coded data
  import stationData from "./data/stationData.js";
  import lineGroups from "./data/lineGroups.js";
  import lineGroupIntervals from "./data/lineGroupIntervalsWithShapes.js";
  import shapes from "./data/shapes.js";

  // Import helpers
  import api from "./helpers/api.js";
  import mergeTripUpdateAndVehicleEntities from "./helpers/mergeTripUpdateAndVehicleEntities.js";
  import stationHelpers from "./helpers/stationHelpers.js";
  import leaflet from "./helpers/leaflet.js";

  // Initialize variables
  const trainsArray = []; // Array of Train objects
  const stations = {}; // Station objects with stopId keys
  const stationStopIds = []; // Iterable array of station stopIds
  let combinedIntervals = {}; // Intervals with combined data per lineGroup

  // UPDATE_FREQUENCY_IN_SECONDS is set in /config.js
  const updateFreqency = parseInt(UPDATE_FREQUENCY_IN_SECONDS) * 1000;

  // lineColors keys are lineIds
  const lineColors = {};
  lineGroups.forEach(i => {
    i.lines.forEach(j => {
      lineColors[j] = i.color
    });
  });

  (async function main() {
    // Draw the map tiles
    leaflet.drawMap();

    // Create a Station object from hard coded station data
    stationData.forEach(i => {
      const station = new Station(i)
      stations[station.stopId] = station;
      stationStopIds.push(station.stopId);
    });

    // Add Interval objects to Station objects from hard coded interval data
    combinedIntervals = Interval.combineIntervals(lineGroupIntervals, stations);

    // Draw tracks by drawing each interval lines between stations
    Object.keys(combinedIntervals).forEach(nStationId => {
      Object.keys(combinedIntervals[nStationId]).forEach(sStationId => {
        const interval = combinedIntervals[nStationId][sStationId];
        leaflet.drawInterval(interval);
      })
    })

    // Draw dots for each station
    for (let i in stations) {
      leaflet.drawStation(stations[i]);
    }

    drawLoop();
    setInterval(drawLoop, updateFreqency);

  })();



  // This function will be run every UPDATE_FREQUENCY_IN_SECONDS seconds
  async function drawLoop() {
    try {
      lineGroups.forEach(async lineGroup => {
          
        const activeLines = ["g"];
        if (activeLines.indexOf(lineGroup.apiSuffix) < 0) {
          return;
        }

        // Get data from API for a specific line group
        // 🚸 Maybe this should have a callback instead of awaiting?
        const tripEntities = await api.getMtaFeed(lineGroup.apiSuffix);
        //console.log(JSON.stringify(tripEntities))
        
        // Combine TripUpdate and Vehicle data:
        const combinedTripEntities = mergeTripUpdateAndVehicleEntities(tripEntities);

        console.log(`${combinedTripEntities.length} train updates for ${lineGroup.apiSuffix.toUpperCase()}`);
        //console.log(`${tripEntities.length} entities becomes data for ${combinedTripEntities.length} trains`)
        
        // Validate data and create TripEntity objects
        const tripEntityObjects = combinedTripEntities.map((i, index) => new TripEntity(i, index));
        //console.log(`Found ${tripEntityObjects.length} trip entity objects.`)

        // 🚸 Only use "Current" type trips for map
        const currentTrips = tripEntityObjects.filter(i => i.type === "Current");
        
        // const types = {}
        // tripEntityObjects.forEach(i => {
        //   if (types[i.type]) {
        //     types[i.type] += 1
        //   } else {
        //     types[i.type] = 1
        //   }
        // });
        //console.log("📊 Types\n:", types)
        //console.log(`of those ${currentTrips.length} are current`);

        //Draw each train at its updated position on the map
        drawEachTrain(currentTrips, lineGroup.apiSuffix);
      })
    } catch (error) {
      console.log("🖋Error:", error);
    }
  }

  // Draw each train on map
  function drawEachTrain(currentTrips, lines) {
    console.log(`drawing ${currentTrips.length} trains for ${lines.toUpperCase()}`)
    currentTrips.forEach(trainUpdate => {
      try {
        let trainObject = trainUpdate.createTrainOrFindTrainIn(trainsArray);

        // 🚸 What are the cases that cause this?
        if (!trainObject) {
          throw "Can't parse train at index " + i;
        }

        trainObject.locate(combinedIntervals, stations)

        if (!trainObject.marker) {
          // New train is drawn on map:
          trainObject.marker = leaflet.drawTrain(trainObject);
          trainsArray.push(trainObject);

        } else {
          // Existing train is moved if lat or long has changed: 
          if (trainObject.move) {
            trainObject.move = false;
            leaflet.moveTrain(trainObject);
          } else {
            console.log(`Not moving train ${trainObject.id}`)
          }
          console.log(""); // 🚸
        }
        
      } catch (error) {
        console.log("Error:", error);
      }
    })
  }

  function parseRoutes(routes) {
    const combinedRoutes = routes.flatMap(i => {
      return i.stops.map(j => {
        j.colors = [i.color];
        return j;
      })
    })

    const uniqueStations = {};
    combinedRoutes.forEach(i => {
      const latlng = `${i.latitude}_${i.longitude}`;
      console.log(i)
      if (!uniqueStations[latlng]) {
        uniqueStations[latlng] = i;
      } else {
        uniqueStations[latlng]
      }
    })

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