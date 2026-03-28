import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { feeds } from './feeds';

import type { LineGroup, NYCSU_Entity } from '$lib/types';

const baseUri = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';
const apiKey = '';

export async function getNYCSU_Entity(feedId: LineGroup): Promise<NYCSU_Entity[]> {
	const feed = await getFeed(feedId);
	const mappedEntities = feed.entity.map(mapApiResponse);
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

function mapApiResponse(entity: GtfsRealtimeBindings.transit_realtime.IFeedEntity): NYCSU_Entity {
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
	const mappedEntity = {
		tripId,
		trip,
		stopTimeUpdates,
		currentStopSequence,
		vehicleTimestamp,
		stopId
	};
	return mappedEntity;
}

function reduceFeed(acc: { [key: string]: NYCSU_Entity }, entity: NYCSU_Entity, index: number) {
	const tripId = entity.tripId;
	const match = acc?.[tripId];
	if (!match) {
		acc[tripId] = entity;
	} else {
		if (!compareTrips(entity.trip, match.trip ?? null)) {
			console.log('ALERT_BAD_DATA', {
				tripId,
				trip: entity.trip,
				matchTrip: match.trip
			});
		}
		const current = acc[tripId];
		acc[tripId] = {
			...current,
			stopTimeUpdates: current?.stopTimeUpdates ?? entity?.stopTimeUpdates,
			currentStopSequence: current?.currentStopSequence ?? entity?.currentStopSequence,
			vehicleTimestamp: current?.vehicleTimestamp ?? entity?.vehicleTimestamp,
			stopId: current?.stopId ?? entity?.stopId
		};
	}
	return acc;
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
