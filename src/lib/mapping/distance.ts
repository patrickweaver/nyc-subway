import { METER_LAT_OFFSET, METER_LNG_OFFSET } from '$lib/constants';
import type { LatLng } from '$lib/types';

export function getDistanceFromLatLong(point1: LatLng | null, point2: LatLng | null) {
	if (!point1 || !point2) return [0, 0];
	const latDiff = point2[0] - point1[0];
	const lngDiff = point2[1] - point1[1];
	return [latDiff / METER_LAT_OFFSET, lngDiff / METER_LNG_OFFSET];
}

export function getCoordinatesOfLinearProgressBetweenPoints(
	startPoint: LatLng,
	endPoint: LatLng,
	progress: number
): LatLng {
	return [
		startPoint[0] + (endPoint[0] - startPoint[0]) * progress,
		startPoint[1] + (endPoint[1] - startPoint[1]) * progress
	];
}
