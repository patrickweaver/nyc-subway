require("dotenv").config();

module.exports = {
  MAP_CENTER: "[40.7055585, -73.989109 ]",
  MAP_ZOOM: 14,
  TILE_LAYER:
    "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png",
  TIMEZONE: process.env.TIMEZONE,
  UPDATE_FREQUENCY_IN_SECONDS: 10,
  METER_LAT_OFFSET: process.env.METER_LAT_OFFSET,
  METER_LNG_OFFSET: process.env.METER_LNG_OFFSET,
};
