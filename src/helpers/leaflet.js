import L from "leaflet";
import * as leafletMarkerSlideTo from "leaflet.marker.slideto";

let map; // Map var for leaflet

const markers = {
  // 🚧 Placeholder for train North Bound Train Icon
  ngIcon: L.icon({
    iconUrl: "/images/NG.png",
    iconSize: [24, 24], // size of the icon
    iconAnchor: [12, 12], // point of the icon which will correspond to marker's location
  }),


  // 🚧 Placeholder for train South Bound Train Icon
  sgIcon: L.icon({
    iconUrl: "/images/SG.png",
    iconSize: [24, 24], // size of the icon
    iconAnchor: [12, 12], // point of the icon which will correspond to marker's location
  }),

  // Station
  stationCircle: {
    color: "#9cb48b",
    fillColor: "#73CCA3",
    fillOpacity: 0.5,
    radius: 80,
  },

  // Train Circle:
  trainCircle: {
    color: "#00FF00",
    fillColor: "#44EE44",
    fillOpacity: 1,
    radius: 40,
  },
};

// Draw stations on map (happens on first load)
function drawStation(station, recenter = false) {
  if (!station.latitude || !station.longitude) {
    return;
  }

  L.circle([station.latitude, station.longitude], markers.stationCircle).addTo(
    map
  );
  // 🚸 Can implement functionality when a station is clicked on.
  //.on("click", onMarkerClick);
  /*
  if (recenter) {
    //recenterOnPlace(station);
  }
  */
}

// Draw connecting line between stations
function drawLine(station1, station2) {
  var latlongs = [
    [station1.latitude, station1.longitude],
    [station2.latitude, station2.longitude],
  ];
  L.polyline(latlongs, { color: "green" }).addTo(map);
}

function drawTracks(station1, station2, station3) {
  // 🚸 Will have to have a different calculation for the end of the line.
  if (!station3) {
    return;
  }

  console.log("🚉", station2.name);

  const aPos = [station1.latitude, station1.longitude];
  const bPos = [station2.latitude, station2.longitude];
  const cPos = [station3.latitude, station3.longitude];

  L.polyline([aPos, bPos], { color: "purple" }).addTo(map);

  const dLatLng = (s1, s2) => [s1.latitude - s2.latitude, s1.longitude - s2.longitude];

  let dLatAB, dLngAB, dLatBC, dLngBC;
  [dLatAB, dLngAB] = dLatLng(station2, station1);
  [dLatBC, dLngBC] = dLatLng(station2, station3);

  console.log("AB:", dLatAB, dLngAB, dLatAB / METER_LAT_OFFSET, dLngAB / METER_LNG_OFFSET)
  console.log("BC:", dLatBC, dLngBC, dLatBC / METER_LAT_OFFSET, dLngBC / METER_LNG_OFFSET)

  const bc = Math.abs(Math.atan(dLngBC / dLatBC));
  const ab = Math.abs(Math.atan(dLngAB / dLatAB));

  console.log("bc:", bc * 57.2958, "ab:", ab * 57.2958);

  console.log("Full angle:", ((1.5 * Math.PI) - ab - bc) * 57.2958);
  console.log("Half Angle:", (((1.5 * Math.PI) - ab - bc) / 2)  * 57.2958);

  const offsetAngle = (bc - 3 * ab) / 2;
  const offsetAngle3 = Math.PI * 1.5;
  const offsetAngle2 = Math.PI;
  const offsetAngle1 = Math.PI / 2;
  console.log("Offset Angle:", offsetAngle * 57.2958);

  const dLatOB = Math.sin(offsetAngle) * (50 * METER_LAT_OFFSET);
  const dLngOB = Math.cos(offsetAngle) * (50 * METER_LNG_OFFSET);
  const dLatOB1 = Math.sin(offsetAngle1) * (50 * METER_LAT_OFFSET);
  const dLngOB1 = Math.cos(offsetAngle1) * (50 * METER_LNG_OFFSET);
  const dLatOB2 = Math.sin(offsetAngle2) * (50 * METER_LAT_OFFSET);
  const dLngOB2 = Math.cos(offsetAngle2) * (50 * METER_LNG_OFFSET);
  const dLatOB3 = Math.sin(offsetAngle3) * (50 * METER_LAT_OFFSET);
  const dLngOB3 = Math.cos(offsetAngle3) * (50 * METER_LNG_OFFSET);
  const dLatOB4 = Math.sin(0) * (50 * METER_LAT_OFFSET);
  const dLngOB4 = Math.cos(0) * (50 * METER_LNG_OFFSET);
  console.log("dLatOB:", dLatOB / METER_LAT_OFFSET, "dLngOB:", dLngOB / METER_LNG_OFFSET)


  const oPos = [
    station2.latitude - dLngOB,
    station2.longitude - dLatOB
  ]

  const oPos1 = [
    station2.latitude + dLatOB1,
    station2.longitude - dLngOB1
  ]

  const oPos2 = [
    station2.latitude + dLatOB2,
    station2.longitude - dLngOB2
  ]

  const oPos3 = [
    station2.latitude + dLatOB3,
    station2.longitude - dLngOB3
  ]
  const oPos4 = [
    station2.latitude + dLatOB4,
    station2.longitude - dLngOB4
  ]

  const trainMarker = L.circle(bPos, {
    color: "#000000",
    fillColor: "#DFDFDF",
    fillOpacity: 0.8,
    radius: 50,
  }).addTo(map);
  L.polyline([oPos1, bPos], { color: "red" }).addTo(map);
  L.polyline([oPos2, bPos], { color: "orange" }).addTo(map);
  L.polyline([oPos3, bPos], { color: "yellow" }).addTo(map);
  L.polyline([oPos4, bPos], { color: "green" }).addTo(map);
  L.polyline([oPos, bPos], { color: "white" }).addTo(map);


  /*
  const dLat = (station1.latitude - station2.latitude) / METER_LAT_OFFSET;
  const dLng = (station1.longitude - station2.longitude) / METER_LAT_OFFSET;
  const angle = Math.PI - Math.atan(dLat / dLng);
  const oLat = Math.sin(angle) * 30 * METER_LAT_OFFSET;
  const oLng = Math.sin(angle) * 30 * METER_LAT_OFFSET;

  
  var latlongs2 = [
    [station1.latitude - oLat, station1.longitude + oLng],
    [station2.latitude - oLat, station2.longitude + oLng],
  ];

  L.polyline(latlongs1, { color: "green" }).addTo(map);
  L.polyline(latlongs2, { color: "red" }).addTo(map);
  */
}

function drawTrain(train) {
  console.log(
    "🚇 New Train: (index:",
    train.mostRecentTripEntity.index,
    "), id:",
    train.id,
    "at",
    train.latitude,
    ",",
    train.longitude,
    "going",
    train.direction,
    "type:",
    train.mostRecentTripEntity.type,
    ", startimeTimestamp:",
    train.mostRecentTripEntity.trip.startTimestamp
  );

  let bounds = L.latLng(train.latitude, train.longitude).toBounds(250);

  let trainIcon = markers.sgIcon;
  if (train.direction === "N") {
    trainIcon = markers.ngIcon;
  }

  const trainPosition = [train.latitude, train.longitude];
  //var trainMarker = L.marker(trainPosition, {icon: trainIcon}).addTo(map);
  const trainMarker = L.circle(trainPosition, markers.trainCircle).addTo(map);
  return trainMarker;
}

function moveTrain(train) {
  console.log("🛎 Moving train:", train.id, "going", train.direction);
  const totalDuration = UPDATE_FREQUENCY_IN_SECONDS * 1000;
  const destinations = train.intermediateDestinations;
  train.intermediateDestinations = [];
  destinations.push({ latitude: train.latitude, longitude: train.longitude });
  const numberOfDestinations = destinations.length;
  const durationEach = totalDuration / numberOfDestinations;

  let durationElapsed = 0;

  destinations.forEach((loc) => {
    const timer = durationElapsed;
    setTimeout(() => {
      console.log(
        "⏱ moving ",
        train.id,
        "to:",
        loc.latitude,
        ",",
        loc.longitude,
        "via",
        destinations.length,
        "destinations, for",
        durationEach / 1000,
        "in",
        timer / 1000,
        "seconds."
      );
      train.marker.slideTo([loc.latitude, loc.longitude], {
        duration: durationEach,
        keepAtCenter: false,
      });
    }, timer);
    durationElapsed += durationEach;
  });
}

function drawMap() {
  map = L.map("map").setView(MAP_CENTER, MAP_ZOOM);
  map.zoomControl.setPosition("bottomleft");
  L.tileLayer("TILE_LAYER", {
    attribution:
      '<a href="/map-attribution" target="_blank">Map Attribution</a> &#124; <a href="/terms-of-use" target="_blank">Terms of Use</a>',
    maxZoom: 18,
  }).addTo(map);
  return map;
}

export default {
  markers: markers,
  drawStation: drawStation,
  drawLine: drawLine,
  drawTracks: drawTracks,
  drawTrain: drawTrain,
  moveTrain: moveTrain,
  drawMap: drawMap,
};
