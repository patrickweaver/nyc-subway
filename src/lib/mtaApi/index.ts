import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { feeds } from './feeds';

import { MTA_API_KEY } from '$env/static/private';
import type { LineGroup, NYCSU_Entity, ParsedTripData } from '$lib/types';

const baseUri = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';
const apiKey = MTA_API_KEY ?? '';

export async function getParsedTripData(feedId: LineGroup): Promise<ParsedTripData[]> {
	const feed = await getFeed(feedId);
	const mappedEntities = feed.entity.map(mapApiResponse);
	const parsedTripData = mappedEntities.reduce(reduceFeed, {});
	const parsedTripDataArray = Object.keys(parsedTripData).reduce((a: ParsedTripData[], c) => {
		return [...a, parsedTripData[c]];
	}, []);

	return parsedTripDataArray;
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

function reduceFeed(acc: { [key: string]: ParsedTripData }, entity: NYCSU_Entity, index: number) {
	const tripId = entity.tripId;
	const match = acc?.[tripId];
	if (!match) {
		acc[tripId] = entity;
	} else {
		if (JSON.stringify(entity.trip) !== JSON.stringify(match.trip)) {
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
