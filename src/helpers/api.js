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

function parseFeed(apiResponse) {
  const syncDate = new Date()
  console.log(`Syncing! at ${syncDate.getHours()}:${syncDate.getMinutes()}:${syncDate.getSeconds()}`)

  // Update most recent train data and API time
  const trainData = apiResponse.entity;
  const apiTime = parseInt(apiResponse.header.timestamp);

  return {
    trainData: trainData,
    apiTime: apiTime
  }
}

async function getMtaFeed() {
  const apiResponse = await getFeed("g");
  const trainDataAndTime = parseFeed(apiResponse);
  return trainDataAndTime;
}

module.exports = {
  getMtaFeed: getMtaFeed
}