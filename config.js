require('dotenv').config();

module.exports = {
  MAP_CENTER: "[40.7055585, -73.989109 ]",
  MAP_ZOOM: 13,
  TILE_LAYER: "https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
  TIMEZONE: process.env.TIMEZONE,
  UPDATE_FREQUENCY_IN_SECONDS: "10",
}
