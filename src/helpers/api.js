// Gets feed from backend

import LocalTime from "../classes/LocalTime.js";

async function getFeed(line=false) {
  try {
    if (!line) {
      line = 'all';
    }
    const response = await fetch(`/api/${line}`);
    return await response.json();
  } catch (error) {
    console.log("Error:");
    console.log(error);
  }
}

// Add in timestamp to each entity:
function parseFeed(apiResponse) {
  const timestamp = parseInt(apiResponse.header.timestamp);

  const syncDate = LocalTime.fromCurrentTime();
  const timestampDate = LocalTime.fromTimestamp(timestamp);
  console.log(`Syncing! at ${syncDate.printTime()} and API thinks it's ${timestampDate.printTime()}`)

  const tripEntities = apiResponse.entity.map(i => {
    i.timestamp = timestamp;
    return i;
  });

  return tripEntities;
}

// 🚸 Can deal with more lines here later.
async function getMtaFeed() {
  const apiResponse = await getFeed("g");
  return parseFeed(apiResponse);
}

export default {
  getMtaFeed: getMtaFeed
}