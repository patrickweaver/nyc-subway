// Set up express server
import express from "express";
import cors from "cors";
// Get the current feed from the MTA API
import { getFeed } from "./helpers/getFeed.js";
// 🚸 Currently this does nothing
import { logLocations } from "./helpers/logLocations.js";
import { logResponse } from "./helpers/logResponse.js";

const app = express();
app.use(cors());
app.use(express.static("server/public"));

const mostRecentData = {};
const updateEvery =
  parseInt(process.env.UPDATE_FREQUENCY_IN_SECONDS) * 1000 - 200;

// Check that .env variables are set:
if (
  !process.env.MTA_API_KEY ||
  !process.env.TIMEZONE ||
  !process.env.UPDATE_FREQUENCY_IN_SECONDS
) {
  console.log("Fatal Error: Missing ENV variable.");
  process.exit();
}

// 🚸 Not implemented currently, but will allow collecting data
// to determine how long to expect a train to spend between
// each stop.
const LOG_LOCATIONS = process.env.LOG_LOCATIONS === "true";
const LOG_RESPONSE = process.env.LOG_RESPONSE === "true";

// API endpoint to view all train data
app.get("/api/all", async function (req, res) {
  // 🚸 Not implemented yet, will return error.
  // Probably best to implement this as a loop through all of
  // the individual endpoints since there isn't an endpoint for all
  // of the lines.
  const feedResponse = await getFeed();
  res.json(feedResponse);
});

// API endpoint to view individual line data
app.get("/api/:line", async function (req, res) {
  try {
    let now = new Date().getTime();
    if (!req.params.line) throw "Invalid line.";
    const line = req.params.line.toLowerCase();

    let shouldUpdate = true;
    if (mostRecentData.line) {
      if (mostRecentData.line.timestamp && mostRecentData.line.data) {
        if (now - updateEvery < mostRecentData.line.timestamp) {
          shouldUpdate = false;
        }
      }
    } else {
      mostRecentData.line = {};
    }

    let feedResponse;
    if (shouldUpdate) {
      feedResponse = await getFeed(line);
      mostRecentData.line.timestamp = now;
      mostRecentData.line.data = feedResponse;
    } else {
      feedResponse = mostRecentData.line.data;
    }

    // Run logging module if set via ENV
    if (shouldUpdate && LOG_LOCATIONS) {
      logLocations(feedResponse);
    }
    if (shouldUpdate && LOG_RESPONSE) {
      logResponse(feedResponse, line);
    }

    console.log(
      `📲Sending ${
        shouldUpdate ? "💡 new" : "💾 cached"
      } response for line ${line} to client with ${
        feedResponse.entity.length
      } items.`,
    );

    res.json(feedResponse);
  } catch (error) {
    console.log("Error:", error);
    res.json({ error: error });
  }
});

var listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
