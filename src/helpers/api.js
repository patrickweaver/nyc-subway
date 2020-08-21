// Gets feed from backend

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

  const syncDate = new Date();
  const timestampDate = new Date(timestamp);
  console.log(`Syncing! at ${syncDate.getHours()}:${syncDate.getMinutes()}:${syncDate.getSeconds()} and API thinks it's ${timestampDate.getHours()}:${timestampDate.getMinutes()}:${timestampDate.getSeconds()}`)

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

module.exports = {
  getMtaFeed: getMtaFeed
}