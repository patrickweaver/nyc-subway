<script>
  import api from "./helpers/api.js";

  let gFeed = [];

  const testFeed = [
    {id: 'abc'}, {id: '123'}
  ];

  async function lineSync() {
    gFeed = (await api.getFeed('g')).entity;
    console.log(gFeed)
  }

  lineSync();

</script>

<div id="app">
  <h1>NYC Subway</h1>

  <ul id="ftest">
    {#each testFeed as train}
      <li>
        {train.id}
      </li>
    {/each}
  </ul>

  <ul id="feed">
    {#each gFeed as train}
      <li>
        {train.id}
      </li>
    {/each}
  </ul>

</div>

<style>

</style>