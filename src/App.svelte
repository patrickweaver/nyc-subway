<script>
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  import api from './helpers/api.js';
  import stations from './helpers/stations.js';
  import * as lines from './helpers/lines.js';

  let gFeed = [];
  let apiTime = (new Date()).getTime();
  
  let gStops = stations.getLineStops('G');

  async function lineSync() {
    const response = (await api.getFeed('g'));
    gFeed = response.entity;
    apiTime = response.header.timestamp;
    console.log(gFeed)
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
  <!--
  <table>
    <tr>
      <th>
        Train Id
      </th>
      {#each gStops as station}
      <th>
        {station['Stop Name']}
      </th>
      {/each}
    </tr>
    {#each gFeed as train}
    <tr>
      <td>
        {train.id}
      </td>
      {#each gStops as station}
      <th>
        {#if train.tripUpdate && train.tripUpdate.trip && train.tripUpdate.trip.tripId}  
        {getTripUpdate(train.tripUpdate.stopTimeUpdate, station['GTFS Stop ID'], apiTime)}
        {/if}
      </th>
      {/each}
    </tr>
    {/each}
  </table>
  -->
</div>

<style>

#feed {
  overflow-x: scroll;
  white-space: nowrap;
}

.line-diagram li{
}

th, td {
  border: 1px solid #888;
}

</style>