let map; // Map var for leaflet

const markers = {
  // 🚧 Placeholder for train North Bound Train Icon
  ngIcon: L.icon({
    iconUrl: '/images/NG.png',
    iconSize:     [24, 24], // size of the icon
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
  }),

  // 🚧 Placeholder for train South Bound Train Icon
  sgIcon: L.icon({
    iconUrl: '/images/SG.png',
    iconSize:     [24, 24], // size of the icon
    iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
  }),

  // Station
  stationCircle: {
    color: '#9cb48b',
    fillColor: '#73CCA3',
    fillOpacity: 0.5,
    radius: 80,
  },

}

// Draw stations on map (happens on first load)
function drawStation(station, recenter=false) {
  if (!station.lat || !station.long) {
    return;
  }

  L.circle([station.lat, station.long], markers.stationCircle)
    .addTo(map)
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
  var latlngs = [
    [station1.lat, station1.long],
    [station2.lat, station2.long]
  ];
  L.polyline(latlngs, {color: 'green'}).addTo(map);
}

function drawTrain(train) {
  console.log("🚇 New Train:", train.id, "at", train.latitude, ",", train.longitude, "going", train.direction)

  let bounds = L.latLng(train.latitude, train.longitude).toBounds(250);
  
  let trainIcon = markers.sgIcon;
  if (train.direction === "N") {
    trainIcon = markers.ngIcon;
  }
  
  var trainMarker = L.marker([train.latitude, train.longitude], {icon: trainIcon}).addTo(map);
  return(trainMarker)
}

function moveTrain(train) {
  console.log("🛎 Moving train:", train.id, "to", train.latitude, ",", train.longitude, "going", train.direction)
  const totalDuration = UPDATE_FREQUENCY_IN_SECONDS * 1000;
  const numberOfDestinations = 1 + train.intermediateDestinations.length;
  const durationEach = totalDuration / numberOfDestinations;
  const destinations = train.intermediateDestinations;
  train.intermediateDestinations = [];
  destinations.push({latitude: train.latitude, longitude: train.longitude})

  let durationElapsed = 0;
  destinations.forEach(loc => {
    setTimeout(() => {
      train.marker.slideTo([loc.latitude, loc.longitude], {
        duration: durationEach,
        keepAtCenter: false
      });
    }, durationElapsed);
    durationElapsed += durationEach;
  });
  
}


function drawMap() {
  map = L.map("map")
    .setView(MAP_CENTER, MAP_ZOOM);
  map.zoomControl.setPosition('bottomleft');
  L.tileLayer("TILE_LAYER", {
    attribution: '<a href="/map-attribution" target="_blank">Map Attribution</a> &#124; <a href="/terms-of-use" target="_blank">Terms of Use</a>',
    maxZoom: 18
  }).addTo(map);
  return map
}



export default {
  markers: markers,
  drawStation: drawStation,
  drawLine: drawLine,
  drawTrain: drawTrain,
  moveTrain: moveTrain,
  drawMap: drawMap,
}