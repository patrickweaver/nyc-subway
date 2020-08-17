// Set up express server
const express = require('express');
const app = express();
app.use(express.static('server/public'));

// 🚸 Not implemented currently, but will allow collecting data
// to determine how long to expect a train to spend between
// each stop.
const LOG_LOCATIONS = process.env.LOG_LOCATIONS === "true";

// Get the current feed from the MTA API
const getFeed = require('./helpers/getFeed.js');

// 🚸 Currently this does nothing
const logLocations = require('./helpers/logLocations.js');

// API endpoint to view all train data
app.get('/api/all', async function(req, res) {
  
  // 🚸 Not implemented yet, will return error.
  // Probably best to implement this as a loop through all of
  // the individual endpoints since there isn't an endpoint for all
  // of the lines.
  const feedResponse = await getFeed();
  res.json(feedResponse);
});

// API endpoint to view individual line data
app.get('/api/:line', async function(req, res) {
  const feedResponse = await getFeed((req.params.line).toLowerCase());

  // Run logging module if set via ENV
  if (LOG_LOCATIONS) {
    logLocations(feedResponse);
  }

  res.json(feedResponse);
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});