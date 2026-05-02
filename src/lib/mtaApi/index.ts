import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { feeds } from './feeds';

import type { LineGroup, NYCSU_Entity } from '$lib/types';

const baseUri = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';

export async function getNYCSU_Entity(feedId: LineGroup): Promise<NYCSU_Entity[]> {
	const feed = await getFeed(feedId);
	const _mappedEntities = feed.entity.map(mapApiResponse);
	const mappedEntities = _mappedEntities.filter((i) => !!i);
	const NYCSU_Entity = mappedEntities.reduce(reduceFeed, {});
	const NYCSU_EntityArray = Object.keys(NYCSU_Entity).reduce((a: NYCSU_Entity[], c) => {
		return [...a, NYCSU_Entity[c]];
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
	const stopTimeUpdates =
		tripUpdate?.stopTimeUpdate?.map((i) => ({
			stopId: i.stopId ?? null,
			// arrival and departure times are always identical
			time: i.arrival?.time ? String(i.arrival.time) : null
		})) ?? [];
	const vehicle = entity?.vehicle ?? null;
	const trip = tripUpdate?.trip ?? vehicle?.trip ?? null;
	const currentStopSequence = vehicle?.currentStopSequence ?? null;
	const vehicleTimestamp = vehicle?.timestamp ? String(vehicle.timestamp) : null;
	const stopId = vehicle?.stopId ?? null;
	const tripId = trip?.tripId ?? randomTripId();
	const tripIdParsed = tripId.split(/[._]/).filter((i) => !!i);
	if (tripIdParsed.length !== 3) {
		console.log('ALERT_ERROR_INVALID_TRIP_ID', tripId);
		return null;
	}
	const routeId = tripIdParsed[1];
	const tripDirection = tripIdParsed[2][0];

	let tripStartTimestamp = '-1';
	if (trip?.startDate && trip?.startTime) {
		const year = trip.startDate.slice(0, 4);
		const month = trip.startDate.slice(4, 6);
		const day = trip.startDate.slice(6, 8);
		tripStartTimestamp = `${year}-${month}-${day}T${trip.startTime}-04:00`;
	}
	const vehicleTimestampMs = vehicleTimestamp ? parseInt(vehicleTimestamp) * 1000 : 0;
	console.log(tripId, vehicleTimestamp, vehicleTimestampMs);
	const mappedEntity = {
		trip_id: tripId,
		route_id: routeId,
		trip_direction: tripDirection,
		trip_start_timestamp: tripStartTimestamp,
		trip_start_timestamp_utc: new Date(tripStartTimestamp).toISOString(),
		trip,
		stopTimeUpdates,
		currentStopSequence,
		vehicleTimestamp,
		vehicle_timestamp_utc: new Date(vehicleTimestampMs).toISOString(),
		stopId
	};
	return mappedEntity;
}

function reduceFeed(acc: { [key: string]: NYCSU_Entity }, entity: NYCSU_Entity) {
	const tripId = entity.trip_id;
	const current = acc?.[tripId];
	if (!current) {
		acc[tripId] = entity;
	} else {
		// TODO: This is expensive and shouldn't happen on every request
		if (!compareTrips(entity.trip, current.trip ?? null)) {
			console.log('ALERT_BAD_DATA', {
				trip_id: tripId,
				trip: entity.trip,
				matchTrip: current.trip
			});
		}
		const merged = mergeFeedItems(current, entity);
		acc[tripId] = merged;
	}
	return acc;
}

function mergeFeedItems(item1: NYCSU_Entity, item2: NYCSU_Entity): NYCSU_Entity {
	const vehicleTimestampUtcIsNull = new Date(item1.vehicle_timestamp_utc).getTime() === 0;

	return {
		...item1,
		stopTimeUpdates: item1?.stopTimeUpdates ?? item2?.stopTimeUpdates,
		currentStopSequence: item1?.currentStopSequence ?? item2?.currentStopSequence,
		vehicleTimestamp: item1?.vehicleTimestamp ?? item2?.vehicleTimestamp,
		stopId: item1?.stopId ?? item2?.stopId,
		vehicle_timestamp_utc: vehicleTimestampUtcIsNull
			? item2.vehicle_timestamp_utc
			: item1.vehicle_timestamp_utc
	};
}

function compareTrips(
	trip1: GtfsRealtimeBindings.transit_realtime.ITripDescriptor | null,
	trip2: GtfsRealtimeBindings.transit_realtime.ITripDescriptor | null
) {
	const trip1String = JSON.stringify(trip1);
	const trip2String = JSON.stringify(trip2);
	if (trip1String !== trip2String) return false;
	return true;
}
