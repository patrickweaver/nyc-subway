<script>
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  import api from "./helpers/api.js";
  import stations from "./helpers/stations.js";

  let gFeed = [];
  let apiTime = (new Date()).getTime();
  
  let gStops = stations.getLineStops('G');

  async function lineSync() {
    const response = (await api.getFeed('g'));
    gFeed = response.entity;
    apiTime = response.header.timestamp;
    console.log(gFeed)
    //setTimeout(lineSync, 5000);
  }

  function getStopName(gtfsId) {
    const station = stations.findByGTFS(gtfsId);
    if (!station) {
      return 'Error';
    }
    return `${station['Stop Name']} -- ${station['direction']}`;
  }
  
  function getTripUpdate(stopTimeUpdates, gtfsId) {
   
    let filteredStops = stopTimeUpdates.filter(update => {
      const updateGtfs = update.stopId.substring(0, update.stopId.length - 1);
      //console.log(updateGtfs, gtfsId, typeof updateGtfs, typeof gtfsId);
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

  lineSync();

</script>

<div id="app">
  <h1>NYC Subway</h1>

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
        {#if train.tripUpdate && train.tripUpdate.stopTimeUpdate}
        <!--{}-->
        
        {getTripUpdate(train.tripUpdate.stopTimeUpdate, station['GTFS Stop ID'], apiTime)}
        {/if}
      </th>
      {/each}
    </tr>
    {/each}
  </table>
</div>

<style>

#feed {
  overflow-x: scroll;
  white-space: nowrap;
}

.train-trip {
  display: inline-block;
  border: 1px solid green;
  margin: 5px;
  padding: 5px;
  vertical-align: top;
  overflow-y: scroll;
  height: Calc(100vh - 9em);
}

</style>