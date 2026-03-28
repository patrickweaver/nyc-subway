<script lang="ts">
	import Interval from '$lib/classes/Interval';
	import Station from '$lib/classes/Station';
	import { lineGroupIntervals } from '$lib/data/lineGroupIntervalsWithShapes';
	import lineGroups from '$lib/data/lineGroups';
	import { stationData } from '$lib/data/stationData';
	import type { ApiResponseBody,NYCSU_FeedData, NYCSU_Train } from '$lib/types';
	import { onMount } from 'svelte';
	import { PUBLIC_BASE_API_URI as BASE_API_URI } from '$env/static/public';

	import { writable, type Writable } from 'svelte/store';
	const trains: Writable<{ [key: string]: NYCSU_Train }> = writable({});

	onMount(async () => {
		const leaflet = await import('$lib/leaflet');
		leaflet.drawMap();
		const stations: { [key: string]: Station } = {};
		const stationStopIds: string[] = [];
		let combinedIntervals: {
			[key: string]: {
				[key: string]: Interval;
			};
		} = {}; // Intervals with combined data per lineGroup

		stationData.forEach((i) => {
			const station = new Station(i);
			stations[station.stopId] = station;
			stationStopIds.push(station.stopId);
		});

		combinedIntervals = Interval.combineIntervals(lineGroupIntervals, stations);
		drawAllLines(combinedIntervals, leaflet);

		for (let i in stations) {
			leaflet.drawStation(stations[i]);
		}

		drawLoop();
	});

	function drawAllLines(
		intervals: {
			[key: string]: {
				[key: string]: Interval;
			};
		},
		leaflet: typeof import('$lib/leaflet')
	) {
		Object.keys(intervals).forEach((nStationId) => {
			Object.keys(intervals[nStationId]).forEach((sStationId) => {
				const interval = intervals[nStationId][sStationId];
				leaflet.drawInterval(interval);
			});
		});
	}

	async function drawLoop() {
		try {
			const lineGroup = lineGroups[0];
			const lineFeedData = await getFeed(lineGroup.apiSuffix);
			const trip = lineFeedData.tripData[0].stopTimeUpdates;
			console.log({ trip })
			lineFeedData.tripData.forEach((trip) => {
				const tripId = trip.tripId;
				const updatedStore = { ...$trains };
				const updatedTrain: NYCSU_Train = { 
					lineId: lineGroup.apiSuffix,
					nextStationId: trip.stopTimeUpdates?.[0]?.stopId ?? null,
					nextStationArrivalTime: trip.stopTimeUpdates?.[0]?.time ? parseInt(trip.stopTimeUpdates[0].time) : null,
					lastUpdatedAt: lineFeedData.requestTime
				}
				updatedStore[tripId] = updatedTrain;
				trains.set(updatedStore)


			})
		} catch (error) {
			console.log('Draw Loop Error:', error);
		}
	}

	async function getFeed(line: string = 'all'): Promise<NYCSU_FeedData> {
		const url = `${BASE_API_URI}/${line}`;
		console.log({ url })
		const response = await fetch(url);
		console.log(`Updating for ${line.toUpperCase()} lines`);
		const responseJson: ApiResponseBody = await response.json();
		console.log(responseJson)
		return responseJson.data as NYCSU_FeedData;
	}
</script>

<div>
<div id="map"></div>
<div id="trains">
	<h1>Trains</h1>
	<ul id="train-list">
		{#each Object.keys($trains) as itemId}
			<li>{$trains[itemId].lineId}: {$trains[itemId].nextStationId} ({new Date($trains[itemId].lastUpdatedAt).toLocaleTimeString('en-us', { timeZone: 'America/New_York'})})</li>
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
