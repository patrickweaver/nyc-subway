import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { feeds } from './feeds';

import { MTA_API_KEY } from '$env/static/private';
import type { ParsedTripData } from '$lib/types';

const baseUri = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';
const apiKey = MTA_API_KEY ?? '';

export const getFeed: (
	feedId?: string
) => Promise<GtfsRealtimeBindings.transit_realtime.FeedMessage> = async (feedId) => {
	if (!feedId || !feeds?.[feedId]) {
		throw 'Invalid feedId';
	}
	const url = baseUri + feeds[feedId];
	const headers: HeadersInit = [['x-api-key', apiKey]];
	const response = await fetch(url, { headers });
	if (!response.ok) {
		throw new Error(`${response.url}: ${response.status} ${response.statusText}`);
	}
	const buffer = await response.arrayBuffer();
	const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
	return feed;
};

export const getParsedTripData: (feedId: string) => Promise<ParsedTripData[]> = async (feedId) => {
	const feed = await getFeed(feedId);
	const parsedTripData = feed.entity.reduce((acc: { [key: string]: ParsedTripData }, entity) => {
		const tripUpdate = entity.tripUpdate;
		const stopTimeUpdates = tripUpdate?.stopTimeUpdate;
		const vehicle = entity?.vehicle;
		const trip = tripUpdate?.trip ?? vehicle?.trip;
		const currentStopSequence = vehicle?.currentStopSequence;
		const vehicleTimestamp = vehicle?.timestamp;
		const stopId = vehicle?.stopId;
		const tripId = trip?.tripId ?? String(Math.random()).slice(2, 5);
		const newData = {
			tripId,
			trip,
			stopTimeUpdates,
			currentStopSequence,
			vehicleTimestamp,
			stopId
		};
		const match = acc?.[tripId];
		if (!match) {
			acc[tripId] = newData;
		} else {
			if (JSON.stringify(trip) !== JSON.stringify(match.trip)) {
				console.log('ALERT_BAD_DATA', {
					tripId,
					trip,
					matchTrip: match.trip
				});
			}
			acc[tripId] = {
				...acc[tripId],
				...newData
			};
		}
		return acc;
	}, {});

	const parsedTripDataArray = Object.keys(parsedTripData).reduce((a: ParsedTripData[], c) => {
		a.push(parsedTripData[c]);
		return a;
	}, []);

	return parsedTripDataArray;
};
