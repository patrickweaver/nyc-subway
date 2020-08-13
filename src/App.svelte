<script>
  import L from 'leaflet';

  // Import External Dependencies
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  // Import Classes
  import Train from './classes/Train.js';

  // Import helpers
  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import lines from './helpers/lines.js';
  import checkIfValidTrip from "./helpers/checkIfValidTrip.js";
  import leaflet from "./helpers/leaflet.js"

  // Initialize variables
  let trainData = []; // Most recent API response
  let apiTime = (new Date()).getTime(); // Local server time gets overwritten with timestamp from API.
  let map; // Map var for leaflet
  let trainsOnMap = []; // Trains to draw
  
  // Station data is hard coded
  // See stationData.js, which is generated form stationData.csv
  // 🚸 Currently limiting scope to the G line.
  let gStops = stations.getLineStops('G');

  // Get data from API, parse data, draw train data on map
  async function lineSync() {
    const syncDate = new Date()
    console.log(`Syncing! at ${syncDate.getHours()}:${syncDate.getMinutes()}:${syncDate.getSeconds()}`)
    try {
      // Get data from server API
      const apiResponse = (await api.getFeed('g'));

      // Update most recent train data and API time
      trainData = apiResponse.entity;
      apiTime = parseInt(apiResponse.header.timestamp);

      // Draw each train at its updated position on the map
      drawEachTrain(trainData);
    } catch (error) {
      console.log("Error:");
      console.log(error);
    }
  }
  
  // 🚧 This is not used
  function getTripUpdate(stopTimeUpdates, gtfsId) {
    let filteredStops = stopTimeUpdates.filter(update => {
      const updateGtfs = update.stopId.substring(0, update.stopId.length - 1);
      if (updateGtfs === gtfsId) {
        return true;
      }
    });
    
    if (filteredStops[0]) {
      let arrivalTime = filteredStops[0].arrival.time;
      return formatDistanceStrict(fromUnixTime(arrivalTime), fromUnixTime(apiTime))
    } else {
      return ' ';
    }
  }

  // Draw stations on map (happens on first load)
  function drawPlace(place, recenter=false) {
    if (!place.lat || !place.long) {
      return;
    }

    // Leaflet.js circle options
    const placeOptions = {
      color: '#3cb44b',
      fillColor: '#43CC53',
      fillOpacity: 0.5,
      radius: 80,
    }

    var circle = L.circle([place.lat, place.long], placeOptions)
      .addTo(map)
      // 🚸 Can implement functionality when a station is clicked on.
      //.on("click", onMarkerClick);
    /*
    if (recenter) {
      //recenterOnPlace(place);
    }
    */
  }

  // Draw connecting line between stations
  function connectPlaces(place1, place2) {
    var latlngs = [
      [place1.lat, place1.long],
      [place2.lat, place2.long]
    ];
    var polyline = L.polyline(latlngs, {color: 'red'}).addTo(map);
  }

  const ngIcon = leaflet.icons.ngIcon;
  const sgIcon = leaflet.icons.sgIcon;

  // Draw each train on map
  function drawEachTrain(trains) {
    console.log("Updating Train Positions at", apiTime);

    // Remove previous positions of all trains
    for (var i in trainsOnMap) {
      trainsOnMap[i].remove();
    }

    // Draw an individual train:
    console.log('drawing', trains.length, 'trains')
    for (var i in trains) {
      let train = trains[i];
      console.log(i, "Train Data:");
      //console.log(train);

      // Check for a whole bunch of stuff in the JSON
      // The API response has lots of objects that don't
      // represent trains currently between stations.
      // Objects that have all of the following are trains
      // that we can draw.
      try {
        
        // Check for required properties in train.tripUpdate
        const tripCheck = checkIfValidTrip(i, train.tripUpdate)
        if (!tripCheck.valid) {
          throw tripCheck.error
        }

        // Parse first train stop stopId which contains train direction
        let route = train.tripUpdate.trip.routeId;
        let nextStopIdAndDirection = train.tripUpdate.stopTimeUpdate[0].stopId

        let dL = nextStopIdAndDirection.length;
        let direction = nextStopIdAndDirection.substring(dL - 1, dL);
        let nextStopId = nextStopIdAndDirection.substring(0, dL - 1);

        // All trains are either N or S (uptown/downtown)
        if (!(direction === 'N' || direction === 'S')) {
          throw 'Invalid train direction: ' + direction;
        }

        console.log('index:', i, ' -- route:', route, 'stopId:', nextStopIdAndDirection, 'dL:', dL, 'direction:', direction, 'nextStopId:', nextStopId)

        // Need other station data so find by GTFS
        let nextStation = stations.findByGTFS(nextStopId);

        

        // Find next station stationId in list of stations
        // for the route. Then use index of next station to
        // find the previous station on the route.
        // 🚧 This is wrong for half the trains because the previous station
        // might be the nextStation + 1 instead of - 1.
        let nextStationIndex = lines[route].indexOf(nextStation['GTFS Stop ID']);
        let prevStation;

        // Previous Station index will be different relative to next
        // Station depending on direction of train.
        let prevStationOffset = 1; // N default
        if (direction === 'S') {
          prevStationOffset = -1;
        }
        let prevStationIndex = nextStationIndex + prevStationOffset;


        if (prevStationIndex >= 0 && prevStationIndex < lines[route].length) {
          prevStation = stations.findByGTFS(lines[route][prevStationIndex])
        } else {
          // 🚧 Trains waiting to begin journey have next stop as first or last
          // but will not have a previous station index.
          throw 'Invalid previous station index.'
        }

        // Log the next few stations this train will be at:
        //console.log(train.tripUpdate.trip.tripId, 'nextStopId:', nextStopId, "| next Station GTFS: ", nextStation['GTFS Stop ID'], '| next station name:', nextStation['Stop Name'], '| Next Station Index:', nextStationIndex, '| in', (parseInt(train.tripUpdate.stopTimeUpdate[0].arrival.time) - apiTime), 'seconds');
        let nsu = train.tripUpdate.stopTimeUpdate[0];
        let at = parseInt(nsu.arrival.time);
        let dt = parseInt(nsu.departure.time);

        
        console.log(train.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at, '(', at - apiTime, 'seconds)', '| departing:', dt, '(', dt - apiTime, 'seconds)', nsu.stopId);

        if (train.tripUpdate.stopTimeUpdate[1]) {
          let nsu1 = train.tripUpdate.stopTimeUpdate[1];
          var at1 = parseInt(nsu1.arrival.time);
          var dt1 = parseInt(nsu1.departure.time);
          console.log(train.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at1, '(', at1 - apiTime, 'seconds)', '| departing:', dt1, '(', dt1 - apiTime, 'seconds)', nsu1.stopId);
        }

        if (train.tripUpdate.stopTimeUpdate[2]) {
          let nsu2 = train.tripUpdate.stopTimeUpdate[2];
          var at2 = parseInt(nsu2.arrival.time);
          var dt2 = parseInt(nsu2.departure.time);
          console.log(train.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at2, '(', at2 - apiTime, 'seconds)', '| departing:', dt2, '(', dt2 - apiTime, 'seconds)', nsu2.stopId, '|', at2 - at1);
        }

        if (train.tripUpdate.stopTimeUpdate[3]) {
          let nsu3 = train.tripUpdate.stopTimeUpdate[3];
          var at3 = parseInt(nsu3.arrival.time);
          var dt3 = parseInt(nsu3.departure.time);
          console.log(train.tripUpdate.trip.tripId, '| apiTime:', apiTime, '| arriving:', at3, '(', at3 - apiTime, 'seconds)', '| departing:', dt3, '(', dt3 - apiTime, 'seconds)', nsu3.stopId,  '|', at3 - at2);
        }

        // Can decide where to place train with next and previous station.
        if (prevStation) {
          console.log(train.tripUpdate.trip.tripId, "                      | prev Station GTFS: ", prevStation['GTFS Stop ID'], '| prev station name:', prevStation['Stop Name'], '| Prev Station Index:', nextStationIndex - 1)

          //🚧 Calculate lat/long mid-way between the next statio and the previous
          // station.
          let trainLat = (nextStation['GTFS Latitude'] + prevStation['GTFS Latitude']) / 2;
          let trainLong = (nextStation['GTFS Longitude'] + prevStation['GTFS Longitude']) / 2;

          console.log("Drawing Train:", train.tripUpdate.trip.tripId, "at", trainLat, trainLong, 'next stop:', nextStopIdAndDirection, nextStation['Stop Name'])
          drawTrain(direction, trainLat, trainLong);

        } else {
          throw "Can't find previous station, can't draw train."
        }
        
      } catch (error) {
        console.log("Error:");
        console.log(error);
      }
      console.log(' ')
    }
  }

  function drawTrain(direction, trainLat, trainLong) {
    let bounds = L.latLng(trainLat, trainLong).toBounds(250);

    let imageFile = '/images/NG.png'
    if (direction === 'S') {
      imageFile = '/images/SG.png'
    }

    trainsOnMap.push(L.imageOverlay(imageFile, bounds).addTo(map));
  }

  function drawMap() {
    map = L.map("map")
      .setView(MAP_CENTER, MAP_ZOOM);
    map.zoomControl.setPosition('bottomleft');
    L.tileLayer("TILE_LAYER", {
      attribution: '<a href="/map-attribution" target="_blank">Map Attribution</a> &#124; <a href="/terms-of-use" target="_blank">Terms of Use</a>',
      maxZoom: 18
    }).addTo(map);
  }

  lineSync();
  setInterval(lineSync, 15000);

  (async function main() {
    // Draw the map
    drawMap();
    // Draw all the stations
    for (let i = 0; i < gStops.length; i++) {
      let station = {
        lat: gStops[i]['GTFS Latitude'],
        long: gStops[i]['GTFS Longitude']
      }
      drawPlace(station, false);
      if (gStops[i + 1]) {
        connectPlaces(station, {
          lat: gStops[i + 1]['GTFS Latitude'],
          long: gStops[i + 1]['GTFS Longitude']
        })
      }
    }
  })();
</script>

<style>

</style>