const rp = require('request-promise');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const baseUri = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';

// Values are the MTA urls for each line
const feeds = {
  'a': '-ace',
  'c': '-ace',
  'e': '-ace',
  'ace': '-ace',
  'b': '-bdfm',
  'd': '-bdfm',
  'f': '-bdfm',
  'm': '-bdfm',
  'bdfm': '-bdfm',
  'g': '-g',
  'j': '-jz',
  'z': '-jz',
  'jz': '-jz',
  'n': '-nqrw',
  'q': '-nqrw',
  'r': '-nqrw',
  'w': '-nqrw',
  'nqrw': '-nqrw',
  'l': '-l',
  '1': '',
  '2': '',
  '3': '',
  '4': '',
  '5': '',
  '6': '',
  '123': '',
  '456': '',
  '123456': '',
  '7': '-7',
  'sir': '-si',
  'si': '-si'
}

module.exports = async function(feedId) {

  try {

    if (feeds[feedId] === undefined) {
      throw "Invalid feedId"
    }
    
    var options = {
      uri: baseUri + feeds[feedId],
      encoding: null,
      headers: {
        'User-Agent': 'Request-Promise',
        'x-api-key': process.env.NEW_MTA_API_KEY
      }
    };

  
    const feedResponse = await rp(options);
    // The response is a GTFS object, which needs to be decoded:
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(feedResponse);
    return feed;
  } catch (error) {
    console.log("Error: " + error.substr(0, 50));
    //console.log(error);
    return {error: error}
  }
}