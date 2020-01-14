<script>
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import * as lines from './helpers/lines.js';

  let gFeed = [];
  let apiTime = (new Date()).getTime();
  
  let gStops = stations.getLineStops('G');

  var map;
  var trainsOnMap = [];

  async function lineSync() {
    const response = (await api.getFeed('g'));
    gFeed = response.entity;
    apiTime = response.header.timestamp;
    console.log(gFeed)
    drawTrains(gFeed);
    setTimeout(lineSync, 5000);
  }
  
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

  function drawPlace(place, recenter=false) {
    //console.log(place);
    if (!place.lat || !place.long) {
      return;
    }

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

  var ngIcon = L.icon({
    iconUrl: '/images/NG.png',

    iconSize:     [24, 24], // size of the icon
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
  });

  var sgIcon = L.icon({
    iconUrl: '/images/SG.png',

    iconSize:     [24, 24], // size of the icon
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
  });

  function drawTrains(trains) {

    for (var i in trainsOnMap) {
      trainsOnMap[i].remove();
    }

    console.log('drawing', trains.length, 'trains')
    for (var i in trains) {
      
      let train = trains[i];

      // Check for a whole bunch of stuff in the JSON
      if (
        train.tripUpdate
        && train.tripUpdate.trip
        && train.tripUpdate.trip.routeId
        && train.tripUpdate.stopTimeUpdate
        && train.tripUpdate.stopTimeUpdate[0]
        && train.tripUpdate.stopTimeUpdate[0].stopId
      ) {
        console.log(i, 'stopId:', train.tripUpdate.stopTimeUpdate[0].stopId)
        let route = train.tripUpdate.trip.routeId;
        let dataStopId = train.tripUpdate.stopTimeUpdate[0].stopId

        let dL = dataStopId.length;
        let direction = dataStopId.substring(dL - 1, dL);
        let nextStopId = dataStopId.substring(0, dL - 1);

        let nextStation = stations.findByGTFS(nextStopId);
        console.log("next Station: ", nextStation['GTFS Stop ID'], nextStation['Stop Name'])
        // Maybe if -1 should throw an error
        let nextStationIndex = lines[route].indexOf(nextStation['GTFS Stop ID']);
        console.log('NSI:', nextStationIndex)
        let prevStation;
        if (nextStationIndex > 0) {
          prevStation = stations.findByGTFS(lines[route][nextStationIndex - 1])
        } else {
          prevStation = null;
        }

        

        if (prevStation) {
          console.log("prev Station: ", prevStation['GTFS Stop ID'], prevStation['Stop Name'])

          let trainLat = (nextStation['GTFS Latitude'] + prevStation['GTFS Latitude']) / 2;
          let trainLong = (nextStation['GTFS Longitude'] + prevStation['GTFS Longitude']) / 2;

          console.log("Train:", trainLat, trainLong, dataStopId)

          let bounds = L.latLng(trainLat, trainLong).toBounds(250);

          let imageFile = '/images/NG.png'
          if (direction === 'S') {
            imageFile = '/images/SG.png'
          }

          trainsOnMap.push(L.imageOverlay(imageFile, bounds).addTo(map));
        } else {
          console.log("can't find prev")
        }
      } else {
        //console.log('cond fail')
        //console.log(train)
      }
      console.log(' ')
    }
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
    for (var i in gStops) {
      let station = {
        lat: gStops[i]['GTFS Latitude'],
        long: gStops[i]['GTFS Longitude']
      }
      drawPlace(station, false);
    }
  })();



</script>

<div id="app">
  <h1>NYC Subway G Line Realtime Train Diagram</h1>

  <ul class="line-diagram">
    {#each lines['G'] as stationGtfsId}
    <li>{stationGtfsId} - {stations.findByGTFS(stationGtfsId)['Stop Name']}</li>
    <li>
    {#each gFeed as train}

      {#if train.tripUpdate && train.tripUpdate.stopTimeUpdate}
        {#if train.tripUpdate.stopTimeUpdate[0].stopId.substring(0, train.tripUpdate.stopTimeUpdate[0].stopId.length - 1) === stationGtfsId}
          🚇{#if train.tripUpdate.stopTimeUpdate[0].stopId.substring( train.tripUpdate.stopTimeUpdate[0].stopId.length - 1, train.tripUpdate.stopTimeUpdate[0].stopId.length) === 'S'}⬇️{:else if train.tripUpdate.stopTimeUpdate[0].stopId.substring( train.tripUpdate.stopTimeUpdate[0].stopId.length - 1, train.tripUpdate.stopTimeUpdate[0].stopId.length) === 'N'}⬆️{/if}&nbsp;&nbsp;
        {/if}
      {/if}
    {/each}
    </li>
    {/each}
  </ul>
</div>

<style>

</style>