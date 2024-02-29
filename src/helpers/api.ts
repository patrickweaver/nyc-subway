// Gets feed from backend

// import LocalTime from "../classes/LocalTime";
import { BASE_URI } from "../config.js";
import type { FeedData, FeedEntityDataWithTimestamp } from "../types";

async function getFeed(line: string = "all"): Promise<FeedData> {
  const response = await fetch(`${BASE_URI}/api/${line}`);
  console.log(`Updating for ${line.toUpperCase()} lines`);
  const data: FeedData = await response.json();
  return data;
}

// 🍄 This doesn't seem necessary
// Add in timestamp to each entity:
function parseFeed(apiResponse: FeedData): FeedEntityDataWithTimestamp[] {
  const timestamp = parseInt(apiResponse.header.timestamp, 10);
  // const syncDate = LocalTime.fromCurrentTime();
  // const timestampDate = LocalTime.fromTimestamp(timestamp);
  //console.log(`Syncing! at ${syncDate.printTime()} and API thinks it's ${timestampDate.printTime()}`)

  const tripEntities = apiResponse.entity.map((i) => ({
    ...i,
    timestamp,
  }));
  return tripEntities;
}

async function getMtaFeed(feedId: string) {
  const apiResponse = await getFeed(feedId);
  return parseFeed(apiResponse);
}

export default {
  getMtaFeed: getMtaFeed,
};
