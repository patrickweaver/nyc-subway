<script lang="ts">
	import TrackSection from '$lib/classes/TrackSection';
	import Station from '$lib/classes/Station';
	import { lineGroupTrackSections } from '$lib/data/lineGroupTrackSectionsWithShapes';
	import { lineColors, lineGroups } from '$lib/data/lineGroups';
	import type { ApiResponseBody } from '$lib/types';
	import { onMount } from 'svelte';
	import {
		PUBLIC_BASE_API_URI as BASE_API_URI,
		PUBLIC_UPDATE_FREQUENCY_IN_SECONDS
	} from '$env/static/public';

	import { writable, type Writable } from 'svelte/store';
	import Train from '$lib/classes/Train';
	import { getCoordinatesOfLinearProgressBetweenPoints } from '$lib/mapping/distance';
	const trains: Writable<{ [key: string]: Train }> = writable({});

	const stations = Station.getAllStations();
	const allTrackSections = TrackSection.getAllTrackSections();

	// TODO figure out leaflet imports
	let leaflet: any;

	onMount(async () => {
		leaflet = await import('$lib/leaflet');
		leaflet.drawMap();
		drawAllLines(allTrackSections);

		for (let i in stations) {
			leaflet.drawStation(stations[i]);
		}

		drawLoop();
		// setInterval(drawLoop, parseInt(PUBLIC_UPDATE_FREQUENCY_IN_SECONDS) * 1000);
		// TODO remove only re-fetch twice
		setTimeout(drawLoop, 5000);
		setTimeout(drawLoop, 15000);
		// const ts = allTrackSections['G24']['G26'];
		// // console.log(ts);
		// console.log(ts);
		// const shape = ts.shape;
		// ts.mapPointsToOffsets();
		// const offsets = ts.offsets['LightGreen'];

		// // console.log(offsets);

		// if (!offsets) return;
		// let direction: 'N' | 'S' = Math.random() > 0.99999999999 ? 'S' : 'N';

		// const progress = 0.4;
		// const distances = ts.distances;
		// const distanceProgress = ts.totalDistance * progress;
		// const distanceFromNorthStation =
		// 	direction === 'N' ? ts.totalDistance - distanceProgress : distanceProgress;
		// const pointToNorthIndex = distances.filter((d) => d < distanceFromNorthStation).length - 1;
		// const pointToSouthIndex = Math.min(pointToNorthIndex + 1, distances.length - 1);
		// const distanceBetweenPoints = distances[pointToSouthIndex] - distances[pointToNorthIndex];
		// const distancePastNorthPoint = distanceFromNorthStation - distances[pointToNorthIndex];
		// const interPointFractionFromNorthPoint = distancePastNorthPoint / distanceBetweenPoints;

		// const ns = direction === 'N' ? 1 : 0;
		// const offsetPointToNorth = offsets[pointToNorthIndex][ns];
		// const offsetPointToSouth = offsets[pointToSouthIndex][ns];

		// const progressPosition = getCoordinatesOfLinearProgressBetweenPoints(
		// 	offsetPointToNorth,
		// 	offsetPointToSouth,
		// 	interPointFractionFromNorthPoint
		// );
		// leaflet.drawTrain({ latitude: progressPosition[0], longitude: progressPosition[1], direction });
	});

	function drawAllLines(intervals: {
		[key: string]: {
			[key: string]: TrackSection;
		};
	}) {
		Object.keys(intervals).forEach((nStationId) => {
			Object.keys(intervals[nStationId]).forEach((sStationId) => {
				const interval = intervals[nStationId][sStationId];
				leaflet.drawTrackSection(interval);
			});
		});
	}

	async function drawLoop() {
		try {
			const lineGroup = lineGroups[2];
			const response = await getFeed(lineGroup.apiSuffix);
			const data = response.data;
			const updatedStore = { ...$trains };
			data.entities.forEach((entity) => {
				if (!entity.trip_direction) {
					return;
				}

				if (!entity.trip_route_id) {
					return;
				}

				if (!entity.updates_next_stop_id) {
					return;
				}

				try {
					const tripId = entity.trip_id;

					const train = $trains[tripId];
					const isNewTrain = !train;
					if (isNewTrain) {
						const updatedTrain = new Train(entity);
						updatedTrain.locate();
						leaflet.drawTrain(updatedTrain);
						updatedStore[tripId] = updatedTrain;
					} else {
						console.log('Already tracking train,', tripId);
						train.nextStopId = entity.updates_next_stop_id;
						train.nextStopArrivalTimestamp = entity.updates_next_stop_arrival;
						train.updateTimestamp = entity.vehicle_timestamp;
						train.direction = entity.trip_direction;
						const prevLocation = [train.latitude, train.longitude];
						train.locate();
						const newLocation = [train.latitude, train.longitude];
						if (JSON.stringify(prevLocation) !== JSON.stringify(newLocation)) {
							console.log(train.id + ' Should move from: ', prevLocation, newLocation);
						} else {
							console.log(train.id + ' should not move ');
						}
						if (train.leafletMarker) {
							leaflet.moveTrain(train);
						}
					}
				} catch (error) {
					console.log('TRAIN ERROR\n', error);
				}
			});
			trains.set(updatedStore);
		} catch (error) {
			console.log('Draw Loop Error:', error);
		}
	}

	async function getFeed(line: string = 'all'): Promise<ApiResponseBody> {
		const url = `${BASE_API_URI}/${line}`;
		const response = await fetch(url);
		console.log(`Updating for ${line.toUpperCase()} lines`);
		const responseJson: ApiResponseBody = await response.json();
		return responseJson;
	}
</script>

<div>
	<div id="map"></div>
	<div id="trains">
		<h1>Trains</h1>
		<ul id="train-list">
			{#each Object.keys($trains) as itemId}
				<li>
					{$trains[itemId].routeId}: {$trains[itemId].nextStopId} at {new Date(
						$trains[itemId].nextStopArrivalTimestamp
					)?.toLocaleTimeString('en-us', { timeZone: 'America/New_York' })} (updated: {new Date(
						$trains[itemId].updateTimestamp
					)?.toLocaleTimeString('en-us', { timeZone: 'America/New_York' })})
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	#map {
		height: 50vh;
		flex: 0 0 100%;
		z-index: 1;
		cursor: default;
	}
</style>
