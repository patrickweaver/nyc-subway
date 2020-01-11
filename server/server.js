const express = require('express');
const app = express();
app.use(express.static('server/public'));

const rp = require('request-promise');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

async function getFeed(feedId) {
  
  var options = {
    uri: 'http://datamine.mta.info/mta_esi.php',
    qs: {
      key: process.env.MTA_API_KEY,
      feed_id: feedId
    },
    encoding: null,
    headers: {
      'User-Agent': 'Request-Promise'
    }
  };

  try {
    const feedResponse = await rp(options);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(feedResponse);
    return feed;
  } catch (error) {
    console.log(error);
    return {error: error}
  }
  
}


app.get('/api/g', async function(req, res) {
  const feedResponse = await getFeed(31);
  res.send(feedResponse);
});



var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});