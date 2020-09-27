import L from "leaflet";
import * as leafletMarkerSlideTo from "leaflet.marker.slideto";

const RAD_TO_DEG = 57.2958;

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
    color: "#3F3F3F",
    fillColor: "#000000",
    fillOpacity: 0.3,
    radius: 50,
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
  if (!station.latitude || !station.longitude) return;
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

function drawInterval(interval) {
  if (!interval.nStation || !interval.sStation) return;
  if (interval.colors.length === 0) return;
  if (interval.shape.length > 0) {
    interval.shape.forEach((i, index) => {
      if (index < interval.shape.length - 1) {
        const pos1 = [interval.shape[index][0], interval.shape[index][1]];
        const pos2 = [interval.shape[index + 1][0], interval.shape[index + 1][1]];
        // L.polyline([pos1, pos2], {color: interval.colors[0]}).addTo(map);
        interval.colors.forEach(color => {
          const offsets1 = [interval.offsets[color][index][0], interval.offsets[color][index][1]];
          const offsets2 = [interval.offsets[color][index + 1][0], interval.offsets[color][index + 1][1]];
          drawTracks(offsets1, offsets2, color)
        })
      }
    });
  } else {
    const s1Pos = [interval.nStation.latitude, interval.nStation.longitude];
    const s2Pos = [interval.sStation.latitude, interval.sStation.longitude];
    L.polyline([s1Pos, s2Pos], {color: interval.colors[0]}).addTo(map);
  }
}

// Draw connecting line between stations
function drawLine(station1, station2) {
  var latlongs = [
    [station1.latitude, station1.longitude],
    [station2.latitude, station2.longitude],
  ];
  L.polyline(latlongs, { color: "green" }).addTo(map);
}

function drawTracks(offsetsA, offsetsB, color) {
  try {
    // Draw offset line for station B
    //L.polyline(offsetsB, { color: "#00fff2" }).addTo(map); // Aqua

    // Draw N and S offest positions:
    L.circle(offsetsB[0], {radius: 3, color: "pink"}).addTo(map);
    L.circle(offsetsB[1], {radius: 3, color: "pink"}).addTo(map);
    
    //Draw lines between offsets:
    L.polyline([offsetsA[0], offsetsB[0]], { color: color }).addTo(map);
    L.polyline([offsetsA[1], offsetsB[1]], { color: color }).addTo(map);
  } catch (error) {
    console.log(error);
    debugger;
  }
}

// function drawTracks(stationA, stationB, color) {

//   // Draw offset line for station B
//   L.polyline(stationB.offsets, { color: "#00fff2" }).addTo(map); // Aqua

//   // Draw N and S offest positions:
//   L.circle(stationB.offsets[0], {radius: 20, color: "orange"}).addTo(map);
//   L.circle(stationB.offsets[1], {radius: 20, color: "yellow"}).addTo(map);
  
//   //Draw lines between offsets:
//   L.polyline([stationA.offsets[0], stationB.offsets[0]], { color: color }).addTo(map);
//   L.polyline([stationA.offsets[1], stationB.offsets[1]], { color: color }).addTo(map);
// }

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
  drawInterval: drawInterval,
};
