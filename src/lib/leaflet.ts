import Leaflet, { latLng, type MapOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
// import leafletMarkerSlideTo from "leaflet.marker.slideto";
import {
	PUBLIC_MAP_ATTRIBUTION as MAP_ATTRIBUTION,
	PUBLIC_MAP_CENTER as MAP_CENTER,
	PUBLIC_MAP_ZOOM_DEFAULT as MAP_ZOOM_DEFAULT,
	PUBLIC_MAP_ZOOM_MAX as MAP_ZOOM_MAX,
	PUBLIC_TILE_LAYER as TILE_LAYER,
	PUBLIC_UPDATE_FREQUENCY_IN_SECONDS as UPDATE_FREQUENCY_IN_SECONDS
} from '$env/static/public';
import Station from '$lib/classes/Station';
import Interval from '$lib/classes/Interval';
import type { LatLng, LineColor } from '$lib/types';

const mapCenter = JSON.parse(MAP_CENTER);
const options: MapOptions = {
	center: latLng(mapCenter[0], mapCenter[1]),
	zoom: parseInt(MAP_ZOOM_DEFAULT, 10)
};

const RAD_TO_DEG = 57.2958;

let map: Leaflet.Map;

export const markers = {
	// Station
	stationCircle: {
		color: '#3F3F3F',
		fillColor: '#000000',
		fillOpacity: 0.3,
		radius: 50
	},

	// Train Circle:
	trainCircleN: {
		color: 'Black',
		fillColor: 'White',
		fillOpacity: 1,
		radius: 30,
		weight: 1
	},
	trainCircleS: {
		color: 'Black',
		fillColor: 'Pink',
		fillOpacity: 1,
		radius: 30,
		weight: 1
	}
};

// Draw stations on map (happens on first load)
export function drawStation(station: Station, recenter = false) {
	if (!station.latitude || !station.longitude) return;
	Leaflet.circle([station.latitude, station.longitude], markers.stationCircle).addTo(map);
	// 🚸 Can implement functionality when a station is clicked on.
	//.on("click", onMarkerClick);
	/*
  if (recenter) {
    //recenterOnPlace(station);
  }
  */
}

export function drawInterval(interval: Interval) {
	if (!interval.nStation || !interval.sStation) return;
	if (interval.colors.length === 0) return;
	if (interval.shape.length > 0) {
		interval.shape.forEach((i, index) => {
			if (index < interval.shape.length - 1) {
				const pos1 = [interval.shape[index][0], interval.shape[index][1]];
				const pos2 = [interval.shape[index + 1][0], interval.shape[index + 1][1]];
				// Leaflet.polyline([pos1, pos2], {color: interval.colors[0]}).addTo(map);
				interval.colors.forEach((color) => {
					const _offsets1 = [
						interval.offsets[color]?.[index]?.[0],
						interval.offsets[color]?.[index]?.[1]
					];
					const _offsets2 = [
						interval.offsets[color]?.[index + 1]?.[0],
						interval.offsets[color]?.[index + 1]?.[1]
					];
					if (_offsets1[0] && _offsets1[1] && _offsets2[0] && _offsets2[1]) {
						// 🧼 Types!
						const offsets1: LatLng[] = _offsets1 as LatLng[];
						const offsets2: LatLng[] = _offsets2 as LatLng[];
						drawTracks(offsets1, offsets2, color, index);
					}
				});
			}
		});
	} else {
		// Fallback for if interval.offsets is not set
		const s1Pos: LatLng = [interval.nStation.latitude, interval.nStation.longitude];
		const s2Pos: LatLng = [interval.sStation.latitude, interval.sStation.longitude];
		Leaflet.polyline([s1Pos, s2Pos], { color: interval.colors[0] }).addTo(map);
	}
}

// function drawSimpleLine(station1, station2) {
// 	Leaflet.polyline([station1, station2], { color: 'green' }).addTo(map);
// }

// function drawShapeDots(shape) {
// 	const dcs = ['red', 'orange', 'yellow', 'green', 'violet', 'black'];
// 	shape.forEach((i, index) => {
// 		Leaflet.circle(i, { radius: 1, color: dcs[index % dcs.length] }).addTo(map);
// 	});
// }

function drawTracks(offsetsA: LatLng[], offsetsB: LatLng[], color: LineColor, index: Number) {
	// console.log({ offsetsA, offsetsB, color, index });
	try {
		// Draw offset line for station B
		//Leaflet.polyline(offsetsB, { color: "#00fff2" }).addTo(map); // Aqua

		// Draw N and S offest positions:
		const dcs = ['red', 'orange', 'yellow', 'green', 'violet', 'black'];
		//Leaflet.circle(offsetsA[0], {radius: 1, color: dcs[index % dcs.length]}).addTo(map);
		//Leaflet.circle(offsetsA[1], {radius: 1, color: dcs[index % dcs.length]}).addTo(map);

		// 🍄 Why are empty lat/lng pairs called?
		if (offsetsA[0] && offsetsB[0] && offsetsA[1] && offsetsB[1]) {
			//Draw lines between offsets:
			Leaflet.polyline([offsetsA[0], offsetsB[0]], { color: color }).addTo(map);
			Leaflet.polyline([offsetsA[1], offsetsB[1]], { color: color }).addTo(map);
		}
	} catch (error) {
		console.log(error);
		debugger;
	}
}

// function drawTrain(train) {
// 	// console.log(
// 	//   "🚇 New Train: (index:",
// 	//   train.mostRecentTripEntity.index,
// 	//   "), id:",
// 	//   train.id,
// 	//   "at",
// 	//   train.latitude,
// 	//   ",",
// 	//   train.longitude,
// 	//   "going",
// 	//   train.direction,
// 	//   "type:",
// 	//   train.mostRecentTripEntity.type,
// 	//   ", startimeTimestamp:",
// 	//   train.mostRecentTripEntity.trip.startTimestamp
// 	// );

// 	let bounds = Leaflet.latLng(train.latitude, train.longitude)?.toBounds(250);

// 	const trainPosition = [train.latitude, train.longitude];
// 	//var trainMarker = Leaflet.marker(trainPosition, {icon: trainIcon}).addTo(map);
// 	const tmo = train.direction === 'N' ? markers.trainCircleN : markers.trainCircleS;
// 	const trainMarker = Leaflet.circle(trainPosition, tmo).addTo(map);
// 	return trainMarker;
// }

// function moveTrain(train) {
// 	console.log('🛎 Moving train:', train.id, 'going', train.direction);
// 	const totalDuration = UPDATE_FREQUENCY_IN_SECONDS * 1000;
// 	let destinations = train.intermediateDestinations;
// 	train.intermediateDestinations = [];

// 	// There may be duplicate destinations from beginning/end of intervals
// 	// or if progress is 0:
// 	destinations = destinations.reduce((acc, cur, index) => {
// 		if (index === 0) {
// 			acc.push(cur);
// 		} else {
// 			const last = acc[acc.length - 1];
// 			if (last.latitude !== cur.latitude || last.longitude !== cur.longitude) {
// 				acc.push(cur);
// 			}
// 		}
// 		return acc;
// 	}, []);

// 	const totalDistance = destinations.reduce((a, c) => a + c.distance, 0);
// 	let durationElapsed = 0;

// 	destinations.forEach((loc) => {
// 		const timer = durationElapsed;
// 		const duration = totalDuration * (loc.distance / totalDistance);
// 		// 🚸 Why does the "in" timing change?
// 		setTimeout(() => {
// 			// console.log("⏱ moving ", train.id, "to:", loc.latitude, ",", loc.longitude, "via", destinations.length, "destinations, for", durationEach / 1000, "in", timer / 1000, "seconds.");
// 			train.marker.slideTo([loc.latitude, loc.longitude], {
// 				duration: duration,
// 				keepAtCenter: false
// 			});
// 		}, timer);
// 		durationElapsed += duration;
// 	});
// }

export function drawMap() {
	map = Leaflet.map('map', options);
	map.zoomControl.setPosition('bottomleft');
	Leaflet.tileLayer(TILE_LAYER, {
		attribution: MAP_ATTRIBUTION,
		maxZoom: parseInt(MAP_ZOOM_MAX, 10),
		crossOrigin: true
	}).addTo(map);
	return map;
}