const express = require('express');
const app = express();
app.use(express.static('server/public'));

const LOG_LOCATIONS = process.env.LOG_LOCATIONS;

const getFeed = require('./helpers/getFeed.js');
const logLocations = require('./helpers/logLocations.js');

app.get('/api/all', async function(req, res) {
  const feedResponse = await getFeed();
  res.send(feedResponse);
});

app.get('/api/:line', async function(req, res) {
  const feedResponse = await getFeed((req.params.line).toLowerCase());
  if (LOG_LOCATIONS) {
    logLocations(feedResponse);
  }
  res.send(feedResponse);
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});