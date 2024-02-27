import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { feeds } from "./feeds.js";

const baseUri =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";

export async function getFeed(feedId = null) {
  try {
    // Passed feedId does not correspond to any line
    if (feedId && feeds[feedId] === undefined) {
      throw "Invalid feedId";
    }

    const url = baseUri + feeds[feedId];
    const headers = [["x-api-key", process.env.MTA_API_KEY]];
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const error = new Error(
        `${response.url}: ${response.status} ${response.statusText}`,
      );
      error.response = response;
      throw error;
    }
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer),
    );
    return feed;
  } catch (error) {
    console.log("Error:\n" + error);
    //console.log(error);
    return { error: error };
  }
}
