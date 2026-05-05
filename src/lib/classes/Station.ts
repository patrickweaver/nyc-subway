import { lineStationIds } from '$lib/data/lineStationIds';
import { stationData } from '$lib/data/stationData';
import type { LineName, StationData, TrainDirection } from '$lib/types';

export default class Station {
	stationId: number;
	complexId: number;
	stopId: string;
	division: string;
	lineName: string;
	name: string;
	borough: string;
	routes: string[];
	structureType: string;
	latitude: number;
	longitude: number;
	directionLabel: {
		n: string;
		s: string;
	};

	constructor(stationDataObject: StationData) {
		const s = stationDataObject;
		this.stationId = s['Station ID'];
		this.complexId = s['Complex ID'];
		this.stopId = String(s['GTFS Stop ID']);
		this.division = s['Division'];
		this.lineName = s['Line'];
		this.name = s['Stop Name'];
		this.borough = s['Borough'];
		this.routes = s['Daytime Routes'].toString().split(' ');
		this.structureType = s['Structure'];
		this.latitude = s['GTFS Latitude'];
		this.longitude = s['GTFS Longitude'];
		this.directionLabel = {
			n: s['North Direction Label'],
			s: s['South Direction Label']
		};
		//this.intervals = [];
	}

	static getAllStations() {
		const stations: { [key: string]: Station } = {};
		const stationStopIds: string[] = [];

		stationData.forEach((i) => {
			const station = new Station(i);
			stations[station.stopId] = station;
			stationStopIds.push(station.stopId);
		});
		return stations;
	}

	static getNextPrevStations(routeId: LineName, nextStopId: string, direction: TrainDirection) {
		const stations = this.getAllStations();
		// Locate train between two stations based on the direction and the nextStation
		let nextStation = stations[nextStopId];
		let nextStationIndex = lineStationIds[routeId].indexOf(String(nextStation?.stopId));
		if (nextStationIndex == -1) {
			throw `Can't find next station in line. (${nextStation?.stopId}, nextStopId: ${nextStopId}, ${routeId})`;
		}

		let prevStation;
		let prevStationIndex;

		const isNorthbound = direction === 'N';
		const directionOffset = isNorthbound ? -1 : 1; // "S" if not "N"

		// Previous Station index will be different relative to next
		// Station depending on direction of train.
		prevStationIndex = nextStationIndex - directionOffset;

		if (
			!prevStation &&
			prevStationIndex >= 0 && // nextStation is first in array, direction is "S"
			prevStationIndex < lineStationIds[routeId].length // nextStation is last, direction is "N"
		) {
			const prevStationId = lineStationIds[routeId][prevStationIndex];
			prevStation = stations[prevStationId];
		}

		if (!prevStation) {
			throw "Can't find previous station";
		}

		return { nextStation, prevStation };
	}
}
