<script lang="ts">
	import TrackSection from '$lib/classes/TrackSection';
	import Station from '$lib/classes/Station';
	import { lineGroupTrackSections } from '$lib/data/lineGroupTrackSectionsWithShapes';
	import lineGroups from '$lib/data/lineGroups';
	import { stationData } from '$lib/data/stationData';
	import type { ApiResponseBody } from '$lib/types';
	import { onMount } from 'svelte';
	import { PUBLIC_BASE_API_URI as BASE_API_URI } from '$env/static/public';

	import { writable, type Writable } from 'svelte/store';
	import Train from '$lib/classes/Train';
	const trains: Writable<{ [key: string]: Train }> = writable({});

	const stations: { [key: string]: Station } = {};
	const stationStopIds: string[] = [];
	let combinedTrackSections: {
			[key: string]: {
				[key: string]: TrackSection;
			};
		} = {}; // TrackSections with combined data per lineGroup
	// TODO figure out leaflet imports
	let leaflet: any

	onMount(async () => {
		leaflet = await import('$lib/leaflet');
		leaflet.drawMap();
		
		stationData.forEach((i) => {
			const station = new Station(i);
			stations[station.stopId] = station;
			stationStopIds.push(station.stopId);
		});

		combinedTrackSections = TrackSection.combineTrackSections(lineGroupTrackSections, stations);
		drawAllLines(combinedTrackSections);

		for (let i in stations) {
			leaflet.drawStation(stations[i]);
		}

		drawLoop();
	});

	function drawAllLines(
		intervals: {
			[key: string]: {
				[key: string]: TrackSection;
			};
		},
	) {
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
			const data = response.data
			data.entities.forEach((entity) => {
				const tripId = entity.trip_id;
				const updatedStore = { ...$trains };
				const updatedTrain = new Train(entity)
				updatedTrain.locate(combinedTrackSections, stations)
				leaflet.drawTrain(updatedTrain)
				updatedStore[tripId] = updatedTrain;
				trains.set(updatedStore)
			})
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
				{$trains[itemId].routeId}: {$trains[itemId].nextStopId} at {$trains[itemId].nextStopArrivalTimestamp?.toLocaleTimeString('en-us', { timeZone: 'America/New_York'})} (updated: {$trains[itemId].updateTimestamp?.toLocaleTimeString('en-us', { timeZone: 'America/New_York'})})
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
