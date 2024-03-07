<script lang="ts">
	import { onMount } from 'svelte';

	onMount(async () => {
		const leaflet = await import('$lib/leaflet');
		leaflet.drawMap();
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
