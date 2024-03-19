<script lang="ts">
	import Interval from '$lib/classes/Interval';
	import Station from '$lib/classes/Station';
	import { lineGroupIntervals } from '$lib/data/lineGroupIntervalsWithShapes';
	import lineGroups from '$lib/data/lineGroups';
	import { stationData } from '$lib/data/stationData';
	import type { ApiResponseBody, FeedData } from '$lib/types';
	import { onMount } from 'svelte';
	import { PUBLIC_BASE_API_URI as BASE_API_URI } from '$env/static/public';

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
		leaflet: typeof import('/Users/pw/Projects/nyc-subway/src/lib/leaflet')
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
			const lineFeedData = await getFeed(lineGroup?.apiSuffix);
			const trip = lineFeedData.tripData[0].stopTimeUpdates;
		} catch (error) {
			console.log('Draw Loop Error:', error);
		}
	}

	async function getFeed(line: string = 'all'): Promise<FeedData> {
		const response = await fetch(`${BASE_API_URI}/${line}`);
		console.log(`Updating for ${line.toUpperCase()} lines`);
		const responseJson: ApiResponseBody = await response.json();
		return responseJson.data as FeedData;
	}
</script>

<div id="map"></div>

<style>
	#map {
		height: 100vh;
		flex: 0 0 100%;
		z-index: 1;
		cursor: default;
	}
</style>
