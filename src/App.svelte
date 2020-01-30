<script>

  // Import External Dependencies
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  // Import helpers
  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import * as lines from './helpers/lines.js';

  // Initialize variables
  let gFeed = []; // Most recent API response
  let apiTime = (new Date()).getTime(); // Local server time gets overwritten with timestamp from API.
  let map; // Map var for leaflet
  let trainsOnMap = []; // Trains to draw
  
  // Station data is hard coded
  let gStops = stations.getLineStops('G');

  // Get data from API, parse data, draw train data on map
  async function lineSync() {
    const response = (await api.getFeed('g'));
    gFeed = response.entity;
    apiTime = response.header.timestamp;
    console.log(gFeed)
    drawEachTrain(gFeed);
    //setTimeout(lineSync, 5000);
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
    //console.log(place);
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
      //.on("click", onMarkerClick);
    if (recenter) {
      //recenterOnPlace(place);
    }
  }

  // Draw connecting line between stations
  function connectPlaces(place1, place2) {
    var latlngs = [
      [place1.lat, place1.long],
      [place2.lat, place2.long]
    ];
    var polyline = L.polyline(latlngs, {color: 'red'}).addTo(map);
  }

  // 🚧 Placeholder for train North Bound Train Icon
  var ngIcon = L.icon({
    iconUrl: '/images/NG.png',

    iconSize:     [24, 24], // size of the icon
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
  });

  // 🚧 Placeholder for train South Bound Train Icon
  var sgIcon = L.icon({
    iconUrl: '/images/SG.png',

    iconSize:     [24, 24], // size of the icon
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
  });

  // Draw each train on map
  function drawEachTrain(trains) {

    // Remove previous positions of trains
    for (var i in trainsOnMap) {
      trainsOnMap[i].remove();
    }

    // Draw an individual train:
    console.log('drawing', trains.length, 'trains')
    for (var i in trains) {
      let train = trains[i];

      // Check for a whole bunch of stuff in the JSON
      // The API response has lots of objects that don't
      // represent trains currently between stations.
      // Objects that have all of the following are trains
      // that we can draw.
      try {
        if (!train.tripUpdate) {
          throw `index ${i} train has no "tripUpdate" property.`
        }
        if (!train.tripUpdate.trip) {
          throw `index ${i} train.tripUpdate has no "trip" property.`
        }
        if (!train.tripUpdate.trip.routeId) {
          throw `index ${i} train.tripUpdate.trip has no "routeId" property.`
        }
        if (!train.tripUpdate.stopTimeUpdate) {
          throw `index ${i} train.tripUpdate has no "stopTimeUpdate" property.`
        }
        // Only need information about the next stop
        // 🚧 Sometimes the first stop is in the recent past
        if (!train.tripUpdate.stopTimeUpdate[0]) {
          throw `index ${i} train.tripUpdate.stopTimeUpdate is empty or not an array.`
        }
        if (!train.tripUpdate.stopTimeUpdate[0].stopId) {
          throw `index ${i} train.tripUpdate.stopTimeUpdate[0] has no "stopId" property.`
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
        if (nextStationIndex > 0) {
          prevStation = stations.findByGTFS(lines[route][nextStationIndex - 1])
        } else {
          // 🚧 Maybe if -1 should throw an error
          prevStation = null;
        }

        console.log('nextStopId:', nextStopId, "| next Station GTFS: ", nextStation['GTFS Stop ID'], '| next station name:', nextStation['Stop Name'], '| Next Station Index:', nextStationIndex);

        if (prevStation) {
          console.log("                | prev Station GTFS: ", prevStation['GTFS Stop ID'], '| prev station name:', prevStation['Stop Name'], '| Prev Station Index:', nextStationIndex - 1)

          //🚧 Calculate lat/long mid-way between the next statio and the previous
          // station.
          let trainLat = (nextStation['GTFS Latitude'] + prevStation['GTFS Latitude']) / 2;
          let trainLong = (nextStation['GTFS Longitude'] + prevStation['GTFS Longitude']) / 2;

          console.log("Drawing Train:", nextStopIdAndDirection, "at", trainLat, trainLong, )
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