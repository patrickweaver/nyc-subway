const rp = require("request-promise");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const feeds = require("./feeds");

const baseUri =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";

module.exports = async function (feedId = null) {
  try {
    // Passed feedId does not correspond to any line
    if (feedId && feeds[feedId] === undefined) {
      throw "Invalid feedId";
    }

    var options = {
      uri: baseUri + feeds[feedId],
      encoding: null,
      headers: {
        "User-Agent": "Request-Promise",
        "x-api-key": process.env.MTA_API_KEY,
      },
    };

    const feedResponse = await rp(options);
    // The response is a GTFS object, which needs to be decoded:
    const feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(feedResponse);
    return feed;
  } catch (error) {
    console.log("Error: " + error);
    //console.log(error);
    return { error: error };
  }
};
