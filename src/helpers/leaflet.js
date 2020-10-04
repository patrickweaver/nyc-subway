import L from "leaflet";
import * as leafletMarkerSlideTo from "leaflet.marker.slideto";

const RAD_TO_DEG = 57.2958;

let map; // Map var for leaflet

const markers = {
  // Station
  stationCircle: {
    color: "#3F3F3F",
    fillColor: "#000000",
    fillOpacity: 0.3,
    radius: 50,
  },

  // Train Circle:
  trainCircleN: {
    color: "Black",
    fillColor: "White",
    fillOpacity: 1,
    radius: 30,
    weight: 1,
  },
  trainCircleS: {
    color: "Black",
    fillColor: "Pink",
    fillOpacity: 1,
    radius: 30,
    weight: 1,
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
          drawTracks(offsets1, offsets2, color, index)
        })
      }
    });
  } else {
    // Fallback for if interval.offsets is not set
    const s1Pos = [interval.nStation.latitude, interval.nStation.longitude];
    const s2Pos = [interval.sStation.latitude, interval.sStation.longitude];
    L.polyline([s1Pos, s2Pos], {color: interval.colors[0]}).addTo(map);
  }
}

function drawSimpleLine(station1, station2) {
  L.polyline([station1, station2], { color: "green" }).addTo(map);
}

function drawShapeDots(shape) {
  const dcs = ["red", "orange", "yellow", "green", "violet", "black"]
  shape.forEach((i, index) => {
    L.circle(i, {radius: 1, color: dcs[index % dcs.length]}).addTo(map);
  })
}

function drawTracks(offsetsA, offsetsB, color, index) {
  try {
    // Draw offset line for station B
    //L.polyline(offsetsB, { color: "#00fff2" }).addTo(map); // Aqua

    // Draw N and S offest positions:
    const dcs = ["red", "orange", "yellow", "green", "violet", "black"]
    //L.circle(offsetsA[0], {radius: 1, color: dcs[index % dcs.length]}).addTo(map);
    //L.circle(offsetsA[1], {radius: 1, color: dcs[index % dcs.length]}).addTo(map);
    
    //Draw lines between offsets:
    L.polyline([offsetsA[0], offsetsB[0]], { color: color }).addTo(map);
    L.polyline([offsetsA[1], offsetsB[1]], { color: color }).addTo(map);
  } catch (error) {
    console.log(error);
    debugger;
  }
}

function drawTrain(train) {
  // console.log(
  //   "🚇 New Train: (index:",
  //   train.mostRecentTripEntity.index,
  //   "), id:",
  //   train.id,
  //   "at",
  //   train.latitude,
  //   ",",
  //   train.longitude,
  //   "going",
  //   train.direction,
  //   "type:",
  //   train.mostRecentTripEntity.type,
  //   ", startimeTimestamp:",
  //   train.mostRecentTripEntity.trip.startTimestamp
  // );

  let bounds = L.latLng(train.latitude, train.longitude).toBounds(250);

  const trainPosition = [train.latitude, train.longitude];
  //var trainMarker = L.marker(trainPosition, {icon: trainIcon}).addTo(map);
  const tmo = train.direction === "N" ? markers.trainCircleN : markers.trainCircleS;
  const trainMarker = L.circle(trainPosition, tmo).addTo(map);
  return trainMarker;
}

function moveTrain(train) {
  console.log("🛎 Moving train:", train.id, "going", train.direction);
  const totalDuration = UPDATE_FREQUENCY_IN_SECONDS * 1000;
  let destinations = train.intermediateDestinations;
  train.intermediateDestinations = [];

  // There may be duplicate destinations from beginning/end of intervals
  // or if progress is 0:
  destinations = destinations.reduce((acc, cur, index) => {
    if (index === 0) {
      acc.push(cur);
    } else {
      const last = acc[acc.length - 1];
      if (last.latitude !== cur.latitude || last.longitude !== cur.longitude) {
        acc.push(cur);
      }
    }
    return acc;
  }, []);

  const totalDistance = destinations.reduce((a, c) => a + c.distance, 0);
  let durationElapsed = 0;

  destinations.forEach((loc) => {
    const timer = durationElapsed;
    const duration = totalDuration * (loc.distance / totalDistance);
    // 🚸 Why does the "in" timing change?
    setTimeout(() => {
      // console.log("⏱ moving ", train.id, "to:", loc.latitude, ",", loc.longitude, "via", destinations.length, "destinations, for", durationEach / 1000, "in", timer / 1000, "seconds.");
      train.marker.slideTo([loc.latitude, loc.longitude], {
        duration: duration,
        keepAtCenter: false,
      });
    }, timer);
    durationElapsed += duration;
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
  drawSimpleLine: drawSimpleLine,
  drawShapeDots: drawShapeDots,
  drawTracks: drawTracks,
  drawTrain: drawTrain,
  moveTrain: moveTrain,
  drawMap: drawMap,
  drawInterval: drawInterval,
};
