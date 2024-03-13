<script lang="ts">
	import Interval from '$lib/classes/Interval';
	import Station from '$lib/classes/Station';
	import { lineGroupIntervals } from '$lib/data/lineGroupIntervalsWithShapes';
	import { stationData } from '$lib/data/stationData';
	import { onMount } from 'svelte';

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

		Object.keys(combinedIntervals).forEach((nStationId) => {
			Object.keys(combinedIntervals[nStationId]).forEach((sStationId) => {
				const interval = combinedIntervals[nStationId][sStationId];
				leaflet.drawInterval(interval);
			});
		});

		for (let i in stations) {
			leaflet.drawStation(stations[i]);
		}
	});
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
