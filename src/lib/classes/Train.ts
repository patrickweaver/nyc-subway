import type {
	LineColor,
	LineName,
	NYCSU_Entity,
	NYCSU_TrainLocation,
	TrainDirection
} from '$lib/types';
import type GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import TrackSection from './TrackSection';
import Station from './Station';
import { lineColors } from '$lib/data/lineGroups';
import { lineStationIds } from '$lib/data/lineStationIds';
import { stationWaitTimes } from '$lib/data/stationWaitTimes';
import Victor from 'victor';
import type { Circle } from 'leaflet';
import { getCoordinatesOfLinearProgressBetweenPoints } from '$lib/mapping/distance';

const allTrackSections = TrackSection.getAllTrackSections();

export default class Train {
	id: string;
	direction: TrainDirection | null;
	routeId: LineName | null;
	currentStopId: string | null;
	currentStatus: GtfsRealtimeBindings.transit_realtime.VehiclePosition.VehicleStopStatus | null;
	nextStopId: string | null;
	nextStopArrivalTimestamp: number;
	currentTrackSection: TrackSection | null;
	currentTrackSectionNextPointIndex: number | null;
	previousTrackSection: TrackSection | null;
	previousTrackSectionNextPointIndex: number | null;
	updateTimestamp: number;
	latitude: number | null;
	longitude: number | null;
	intermediateDestinations: Array<NYCSU_TrainLocation>;
	// TODO what type is this?
	leafletMarker: Circle | null;
	move: boolean;
	progress: number;
	data: any;

	constructor(entity: NYCSU_Entity) {
		let routeId: string | null = entity.trip_route_id;
		if (
			routeId !== 'A' &&
			routeId !== 'C' &&
			routeId !== 'E' &&
			routeId !== 'B' &&
			routeId !== 'D' &&
			routeId !== 'F' &&
			routeId !== 'M' &&
			routeId !== 'G' &&
			routeId !== 'J' &&
			routeId !== 'Z' &&
			routeId !== 'N' &&
			routeId !== 'Q' &&
			routeId !== 'R' &&
			routeId !== 'W' &&
			routeId !== 'L' &&
			routeId !== '1' &&
			routeId !== '2' &&
			routeId !== '3' &&
			routeId !== '4' &&
			routeId !== '5' &&
			routeId !== '6' &&
			routeId !== 'GS' &&
			routeId !== '7' &&
			routeId !== 'SIR' &&
			routeId !== 'H' &&
			routeId !== '5X' &&
			routeId !== '6X' &&
			routeId !== 'FS'
		)
			routeId = null;

		this.id = entity.trip_id;
		this.direction = entity.trip_direction;
		this.routeId = routeId;
		this.currentStopId = entity.vehicle_current_stop_id;
		this.currentStatus = entity.vehicle_current_status;
		this.nextStopId = entity.updates_next_stop_id;
		this.nextStopArrivalTimestamp = entity.updates_next_stop_arrival;
		this.currentTrackSection = null;
		this.currentTrackSectionNextPointIndex = null;
		this.previousTrackSection = null;
		this.previousTrackSectionNextPointIndex = null;
		this.updateTimestamp = entity.vehicle_timestamp;
		this.latitude = null;
		this.longitude = null;
		this.intermediateDestinations = [];
		this.leafletMarker = null;
		this.move = false;
		this.progress = 0;
		this.data = entity;
	}

	// Update a train's lat/long based on it's most recent
	// next station and expected arrival time.
	locate() {
		try {
			// TODO backend should not send next stop arrival estimates in the
			// past
			const waitTimeEstimateMs = this.nextStopArrivalTimestamp - this.updateTimestamp;
			if (waitTimeEstimateMs < 0) {
				throw new Error('ERROR TODO invalid waitTimeEstimate');
			}

			const waitTimeEstimateSec = waitTimeEstimateMs / 1000;
			const trainPos = this.findPosition(waitTimeEstimateSec);

			if (!trainPos?.latitude || !trainPos?.longitude) {
				throw 'Error finding lat/long.';
			}

			if (
				(this.leafletMarker && this.latitude != trainPos.latitude) ||
				this.longitude != trainPos.longitude
			) {
				this.move = true;
			}

			this.latitude = trainPos.latitude;
			this.longitude = trainPos.longitude;
			this.intermediateDestinations = trainPos.intermediateDestinations;
		} catch (error) {
			console.log('Error locating train:', error);
		}
	}

	findPosition(waitTimeEstimateSec: number) {
		if (!this.routeId) {
			throw 'Invalid routeId: ' + this.routeId;
		}

		if (!this.nextStopId) {
			throw 'Invalid nextStopId: ' + this.nextStopId;
		}

		const lineColor = lineColors[this.routeId];

		if (!lineColor) {
			throw 'Invalid lineColor : ' + lineColor;
		}

		if (!this.direction) {
			throw 'Invalid direction: ' + this.direction;
		}

		const isNorthbound = this.direction === 'N';
		const directionOffset = isNorthbound ? -1 : 1; // "S" if not "N"

		// Confirm route is valid:
		if (!lineStationIds[this.routeId]) {
			throw 'Invalid routeId: ' + this.routeId;
		}

		const current = new Date(this.updateTimestamp ?? 0).getTime();
		const start = new Date(this.data.trip_start_timestamp_string ?? 0).getTime();

		if (current === start) {
			throw `${this.id} has not started trip`;
		}

		const { nextStation, prevStation } = Station.getNextPrevStations(
			this.routeId,
			this.nextStopId,
			this.direction
		);

		const currentTrackSection = TrackSection.getTrackSection(
			nextStation,
			prevStation,
			this.direction
		);

		this.previousTrackSection = this.currentTrackSection;
		this.previousTrackSectionNextPointIndex = this.currentTrackSectionNextPointIndex;
		this.currentTrackSection = currentTrackSection;

		let updatedProgress = this.getProgress(waitTimeEstimateSec);
		console.log(this.id, 'PROGRESS', updatedProgress, this.currentStatus);
		// Don't let trains go backwards on the same Track Section
		// even if progress goes down
		if (this.previousTrackSection?.id === currentTrackSection.id) {
			if (updatedProgress < this.progress) {
				updatedProgress = this.progress;
			}
		}
		this.progress = updatedProgress;

		if (this.progress < 0 || this.progress > 1) {
			throw new Error('ERROR_INVALID_PROGRESS: ' + this.progress);
		}

		const distances = this.currentTrackSection.distances;
		const distanceProgress = this.currentTrackSection.totalDistance * this.progress;
		const distanceFromNorthStation = isNorthbound
			? this.currentTrackSection.totalDistance - distanceProgress
			: distanceProgress;
		const pointToNorthIndex = Math.max(
			distances.filter((d) => d < distanceFromNorthStation).length - 1,
			0
		);
		const pointToSouthIndex = Math.min(pointToNorthIndex + 1, distances.length - 1);
		const distanceBetweenPoints = distances[pointToSouthIndex] - distances[pointToNorthIndex];
		const distancePastNorthPoint = distanceFromNorthStation - distances[pointToNorthIndex];
		const interPointFractionFromNorthPoint = distancePastNorthPoint / distanceBetweenPoints;

		const offsetIndex = isNorthbound ? 1 : 0;
		const offsets = this.currentTrackSection.offsets[lineColor];
		if (
			!offsets ||
			!offsets?.[pointToNorthIndex]?.[offsetIndex] ||
			!offsets?.[pointToSouthIndex]?.[offsetIndex]
		) {
			throw new Error(
				`INVALID_OFFSETS: ptni: ${pointToNorthIndex}, ptsi: ${pointToSouthIndex}, oi: ${offsetIndex}` +
					JSON.stringify(this.currentTrackSection.offsets)
			);
		}
		const offsetPointToNorth = offsets[pointToNorthIndex][offsetIndex];
		const offsetPointToSouth = offsets[pointToSouthIndex][offsetIndex];

		const trainPosition = getCoordinatesOfLinearProgressBetweenPoints(
			offsetPointToNorth,
			offsetPointToSouth,
			interPointFractionFromNorthPoint
		);

		const { prevPointIndex, nextPointIndex } = isNorthbound
			? { prevPointIndex: pointToSouthIndex, nextPointIndex: pointToNorthIndex }
			: { prevPointIndex: pointToNorthIndex, nextPointIndex: pointToSouthIndex };

		// TODO
		// Reviewed until this point, intermediate destinations functionality may not be working correctly with updated distance data

		// Find every point on the track that the train is on between what was previously
		// the next point and what the current location is and save in intermediateDestinations.
		let intermediateDestinations: NYCSU_TrainLocation[] = [];
		let intermediatePoints = [];

		// If this is the first time we have seen the train there is no previousInterval.
		if (this.previousTrackSection) {
			// ✍️console.log(this.id, `🕰 this.previousTrackSection: ${this.previousTrackSection.id}`);
			// Train is not still in the same interval
			if (this.previousTrackSection.id !== currentTrackSection.id) {
				// ✍️console.log(this.id, `🏡 in new interval (${interval.id}), previous was ${lastUpdateInterval.id}`);
				// Add the rest of the points in the interval it was in
				const lastIndex = isNorthbound ? 0 : this.previousTrackSection.distances.length - 1;
				const pointsFromLastUpdateInterval = this.previousTrackSection.getPoints(
					lineColor,
					this.direction,
					this.previousTrackSectionNextPointIndex ?? 0,
					lastIndex
				);
				intermediateDestinations = intermediateDestinations.concat(pointsFromLastUpdateInterval);
				intermediatePoints.push(
					`${this.previousTrackSectionNextPointIndex} to ${lastIndex} from ${this.previousTrackSection.id}`
				);
				// ✍️console.log(`💎 ${this.id} finishing interval from %c${this.previousTrackSectionNextPointIndex}%c to %c${lastIndex}%c`, "color: red;", "color: black;", "color: red;", "color: black;")
				// ✍️console.log("💚", this.id, intermediatePoints);
				// ✍️console.log(this.id, intermediateDestinations.length, intermediateDestinations)

				// 🧱 Find the rest of the intervals we may have passed and add their points
				const intermediateIntervals = [];
				const ciNStopId = currentTrackSection.nStation.stopId;
				const cNStationIndex = lineStationIds[this.routeId].indexOf(ciNStopId);
				const luiNStopId = this.previousTrackSection.nStation.stopId;
				const luiNStationIndex = lineStationIds[this.routeId].indexOf(luiNStopId);

				//
				for (
					let i = luiNStationIndex + directionOffset;
					i !== cNStationIndex + directionOffset;
					i += directionOffset
				) {
					const piNStationStopId = lineStationIds[this.routeId][i];
					const piSStationStopId = lineStationIds[this.routeId][i + 1];
					if (
						!allTrackSections[piNStationStopId] ||
						!allTrackSections[piNStationStopId][piSStationStopId]
					) {
						console.log('Invalid Interval!');
						// What seems to happen here is that the previous update
						// gave incorrect data.
						// 🚸 Maybe remove train?
						debugger;
					}
					const prevInterval = allTrackSections[piNStationStopId][piSStationStopId];
					// ✍️console.log(`🔋 ${this.id} -- Looping intervals: N: ${piNStationStopId} (${stations[piNStationStopId].name}), S: ${piSStationStopId} (${stations[piSStationStopId].name}), Interval: ${prevInterval ? prevInterval.id : 'Invalid Interval'}`);
					if (!prevInterval) {
						debugger;
					}
					// ✍️console.log(`🌋 ${this.id} -- Also passed interval ${prevInterval.id}`)
					// If this is the current interval:
					const startIndex = isNorthbound ? prevInterval.distances.length - 1 : 0;
					let endIndex = isNorthbound ? 0 : prevInterval.distances.length - 1;
					if (currentTrackSection.id === prevInterval.id) {
						endIndex = prevPointIndex;
					}
					intermediateDestinations = intermediateDestinations.concat(
						prevInterval.getPoints(lineColor, this.direction, startIndex, endIndex)
					);
					intermediatePoints.push(`${startIndex} to ${endIndex} from ${prevInterval.id}`);
				}
			} else {
				// Still in the same interval but may have passed points:
				if (this.previousTrackSectionNextPointIndex ?? Infinity < nextPointIndex) {
					intermediateDestinations = intermediateDestinations.concat(
						currentTrackSection.getPoints(
							lineColor,
							this.direction,
							this.previousTrackSectionNextPointIndex ?? Infinity,
							prevPointIndex
						)
					);
					intermediatePoints.push(
						`${this.previousTrackSectionNextPointIndex} to ${prevPointIndex} from ${currentTrackSection.id}`
					);
					// ✍️console.log(`🛢 ${this.id} moving withing interval from %c${this.previousTrackSectionNextPointIndex}%c to %c${prevPointIndex}%c`, "color: red;", "color: black;", "color: red;", "color: black;")
				}
			}
		}

		// for (let i = this.currentIntervalNextPointIndex; i <= prevLastPassedPointIndex; i++) {
		//   const point = previousIntervalPoints[i];
		//   intermediateDestinations.push({
		//     latitude: point[0],
		//     longitude: point[1],
		//   })
		// }

		// if (lastNextStationIndex && lastNextStationIndex !== nextStationIndex) {
		//   // Add in between stations to .intermediateDestinations. Most
		//   // of the time this won't add anything.
		//   for (
		//     let i = lastNextStationIndex;
		//     i !== nextStationIndex;
		//     i += directionOffset
		//   ) {
		//     const stationId = lines[routeId][i];
		//     const station = stations[stationId];
		//     const latitude = station.stopId;
		//     const longitude = station.stopId;
		//     intermediateDestinations.push({
		//       latitude: latitude,
		//       longitude: longitude
		//     });
		//   }
		// }

		// Add train position to destinations
		intermediateDestinations.push({
			latitude: trainPosition?.[0],
			longitude: trainPosition?.[1],
			index: (prevPointIndex + nextPointIndex) / 2,
			interval: currentTrackSection?.id
		});

		// 🚸 This is repeated calculations but it's happening in different places
		// so it's easier to just do it all again
		// Calculate distances between points:
		intermediateDestinations.map((d, index) => {
			let distance, v1;
			if (index === 0) {
				v1 = new Victor(this.latitude ?? 0, this.longitude ?? 0);
			} else {
				const prev = intermediateDestinations[index - 1];
				v1 = new Victor(prev.latitude ?? 0, prev.longitude ?? 0);
			}
			const v2 = new Victor(d.latitude ?? 0, d.longitude ?? 0);
			d.distance = v1.distance(v2);
			return d;
		});

		if (intermediateDestinations[0] && intermediateDestinations[0].distance === 0) {
			intermediateDestinations = intermediateDestinations.slice(1, intermediateDestinations.length);
		}

		return {
			latitude: trainPosition?.[0],
			longitude: trainPosition?.[1],
			intermediateDestinations: intermediateDestinations
		};
	}

	// Calculate the train's progress based on the current wait time to the next
	// station and the average (or max) wait time for that interval.
	// TODO currently most lines have wait times hard coded to 2 minutes
	getProgress(waitTimeEstimateSec: number) {
		if (!this.routeId || !this.nextStopId || !this.direction) return 0;
		// TODO Don't have stationWaitTimes for all routes
		const waitTimes = stationWaitTimes?.[this.routeId]?.[this.nextStopId]?.[this.direction] ?? {
			avg: 120,
			max: 120
		};
		console.log(this.id, 'WAIT', waitTimeEstimateSec);
		let progressRemaining = waitTimeEstimateSec / waitTimes.avg;
		// Wait time is longer than average
		if (progressRemaining > 1) {
			progressRemaining = waitTimeEstimateSec / waitTimes.max;
		}
		// Wait time is longer than max seen
		if (progressRemaining > 1) {
			progressRemaining = 1;
		}

		const progress = 1 - progressRemaining;
		return progress;
	}
}
