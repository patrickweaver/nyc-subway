import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { feeds } from './feeds';

import type { LineGroup, NYCSU_Entity } from '$lib/types';

const baseUri = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';

export async function getNYCSU_Entity(feedId: LineGroup): Promise<NYCSU_Entity[]> {
	const feed = await getFeed(feedId);
	const _mappedEntities = feed.entity.map(mapApiResponse);
	const mappedEntities = _mappedEntities.filter((i) => !!i);
	const NYCSU_EntityByKey = mappedEntities.reduce(reduceFeed, {});
	const NYCSU_EntityArray = Object.keys(NYCSU_EntityByKey).reduce((a: NYCSU_Entity[], c) => {
		return [...a, NYCSU_EntityByKey[c]];
	}, []);

	return NYCSU_EntityArray;
}

async function getFeed(
	feedId: LineGroup
): Promise<GtfsRealtimeBindings.transit_realtime.FeedMessage> {
	const url = baseUri + feeds[feedId];
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`${response.url}: ${response.status} ${response.statusText}`);
	}
	const buffer = await response.arrayBuffer();
	const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
	return feed;
}

function mapApiResponse(
	entity: GtfsRealtimeBindings.transit_realtime.IFeedEntity
): NYCSU_Entity | null {
	const tripUpdate = entity.tripUpdate ?? null;
	const vehicle = entity?.vehicle ?? null;
	const trip = tripUpdate?.trip ?? vehicle?.trip ?? null;

	const tripId = trip?.tripId ?? randomTripId();
	const tripIdParsed = tripId.split(/[._]/).filter((i) => !!i);
	if (tripIdParsed.length !== 3) {
		console.log('ALERT_ERROR_INVALID_TRIP_ID', tripId);
		return null;
	}
	const tripRouteId = trip?.routeId ?? null;
	const tripDirection = tripIdParsed[2][0];

	let tripStartTimestampString = '-1';
	if (trip?.startDate && trip?.startTime) {
		const year = trip.startDate.slice(0, 4);
		const month = trip.startDate.slice(4, 6);
		const day = trip.startDate.slice(6, 8);
		tripStartTimestampString = `${year}-${month}-${day}T${trip.startTime}-04:00`;
	}

	const nextStopTimeUpdate = tripUpdate?.stopTimeUpdate?.[0];
	const updatesNextStopId = nextStopTimeUpdate?.stopId ?? null;
	const updatesNextStopArrival = nextStopTimeUpdate?.arrival?.time
		? String(nextStopTimeUpdate.arrival.time)
		: '0';
	const updatesNextStopArrivalMs = parseInt(updatesNextStopArrival) * 1000;
	const updatesNextStopDeparture = nextStopTimeUpdate?.departure?.time
		? String(nextStopTimeUpdate.departure.time)
		: '0';
	const updatesNextStopDepartureMs = parseInt(updatesNextStopDeparture) * 1000;

	const vehicleCurrentStopId = vehicle?.stopId ?? null;
	const vehicleCurrentStopSequence = vehicle?.currentStopSequence ?? null;
	const vehicleCurrentStatus = vehicle?.currentStatus ?? null;
	const vehicleTimestamp = vehicle?.timestamp ? String(vehicle.timestamp) : null;
	const vehicleTimestampMs = vehicleTimestamp ? parseInt(vehicleTimestamp) * 1000 : 0;

	const mappedEntity = {
		trip_id: tripId,
		trip_route_id: tripRouteId,
		trip_direction: tripDirection,
		trip_start_timestamp_string: tripStartTimestampString,
		trip_start: new Date(tripStartTimestampString).getTime(),
		updates_next_stop_id: updatesNextStopId,
		updates_next_stop_arrival: updatesNextStopArrivalMs,
		updates_next_stop_departure: updatesNextStopDepartureMs,
		vehicle_current_stop_id: vehicleCurrentStopId,
		vehicle_current_stop_sequence: vehicleCurrentStopSequence,
		vehicle_current_status: vehicleCurrentStatus,
		vehicle_timestamp: vehicleTimestampMs
	};
	return mappedEntity;
}

function reduceFeed(acc: { [key: string]: NYCSU_Entity }, entity: NYCSU_Entity) {
	const tripId = entity.trip_id;
	const current = acc?.[tripId];
	if (!current) {
		acc[tripId] = entity;
	} else {
		const merged = mergeFeedItems(current, entity);
		acc[tripId] = merged;
	}
	return acc;
}

function mergeFeedItems(item1: NYCSU_Entity, item2: NYCSU_Entity): NYCSU_Entity {
	if (!item1?.trip_id || item1.trip_id !== item2?.trip_id) {
		console.log('ERROR_INVALID_ITEMS_FOR_MERGE', item1, item2);
	}

	const vehicleTimestampIsNull = item1.vehicle_timestamp === 0;

	return {
		trip_id: item1.trip_id,
		trip_route_id: item1?.trip_route_id ?? item2?.trip_route_id,
		trip_direction: item1?.trip_direction ?? item2?.trip_direction,
		trip_start: item1?.trip_start ?? item2?.trip_start,
		trip_start_timestamp_string:
			item1?.trip_start_timestamp_string ?? item2?.trip_start_timestamp_string,
		updates_next_stop_id: item1?.updates_next_stop_id ?? item2?.updates_next_stop_id,
		updates_next_stop_arrival: item1?.updates_next_stop_arrival ?? item2?.updates_next_stop_arrival,
		updates_next_stop_departure:
			item1?.updates_next_stop_departure ?? item2?.updates_next_stop_departure,
		vehicle_current_stop_id: item1?.vehicle_current_stop_id ?? item2?.vehicle_current_stop_id,
		vehicle_current_stop_sequence:
			item1?.vehicle_current_stop_sequence ?? item2?.vehicle_current_stop_sequence,
		vehicle_current_status: item1?.vehicle_current_status ?? item2?.vehicle_current_status,
		vehicle_timestamp: vehicleTimestampIsNull ? item2.vehicle_timestamp : item1.vehicle_timestamp
	};
}
