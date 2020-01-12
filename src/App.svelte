<script>
  import { format, fromUnixTime, formatDistanceStrict } from 'date-fns';

  import api from "./helpers/api.js";
  import stations from "./helpers/stations.js";

  let gFeed = [];
  let apiTime = (new Date()).getTime();

  async function lineSync() {
    const response = (await api.getFeed('g'));
    gFeed = response.entity;
    apiTime = response.header.timestamp;
    console.log(gFeed)
    setTimeout(lineSync, 5000);
  }

  function getStopName(gtfsId) {
    const station = stations.findByGTFS(gtfsId);
    if (!station) {
      return 'Error';
    }
    return `${station['Stop Name']} -- ${station['direction']}`;
  }

  lineSync();

</script>

<div id="app">
  <h1>NYC Subway</h1>

  <ul id="feed">
    {#each gFeed as train}
      <li class="train-trip">
        <h4>
          {train.id}
        </h4>
        
        <ol>
          {#if train.tripUpdate && train.tripUpdate.stopTimeUpdate }
          {#each train.tripUpdate.stopTimeUpdate as stopTimeUpdateEntry}
            <li>
              <h5>Train:</h5>
              <ul>
                <!--
                {#if stopTimeUpdateEntry.stopId}
                <li>
                  Stop Id: {stopTimeUpdateEntry.stopId}
                </li>
                {/if}
                -->
                <li>
                  Station: {getStopName(stopTimeUpdateEntry.stopId)}
                </li>
                <li>
                  Time: {formatDistanceStrict(fromUnixTime(stopTimeUpdateEntry.arrival.time), fromUnixTime(apiTime))}
                </li>
                
              </ul>
            </li>
          {/each}
          {/if}
        </ol>
        
      </li>
    {/each}
  </ul>

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