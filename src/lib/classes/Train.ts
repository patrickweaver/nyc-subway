import type { LineColor, LineName, NYCSU_Entity, TrainDirection } from '$lib/types';
import type GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import type TrackSection from './TrackSection';
import type Station from './Station';
import lineGroups from '$lib/data/lineGroups';
import { lineStationIds } from '$lib/data/lineStationIds';
import { stationWaitTimes } from '$lib/data/stationWaitTimes';
import Victor from 'victor';

export default class Train {
	id: string;
	direction: TrainDirection | null;
	routeId: LineName | null;
	currentStopId: string | null;
	currentStatus: GtfsRealtimeBindings.transit_realtime.VehiclePosition.VehicleStopStatus | null;
	nextStopId: string | null;
	nextStopArrivalTimestamp: Date | null;
	// TODO what type is this?
	currentTrackSection: any;
	currentTrackSectionNextPointIndex: number | null;
	updateTimestamp: Date | null;
	latitude: number | null;
	longitude: number | null;
	// TODO what type is this?
	marker: any;
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
		this.nextStopArrivalTimestamp = new Date(entity.updates_next_stop_arrival);
		this.currentTrackSection = null;
		this.currentTrackSectionNextPointIndex = null;
		this.updateTimestamp = new Date(entity.vehicle_timestamp);
		this.latitude = null;
		this.longitude = null;
		this.move = false;
		this.progress = 0;
		this.data = entity;
	}

	// Update a train's lat/long based on it's most recent
	// next station and expected arrival time.
	locate(
		combinedTrackSections: {
			[key: string]: { [key: string]: TrackSection };
		},
		stations: {
			[key: string]: Station;
		}
	) {
		try {
			if (!this.id) {
				throw 'Incomplete train data.';
			}

			// TODO backend should not send next stop arrival estimates in the past
			const waitTimeEstimate =
				this.nextStopArrivalTimestamp && this.updateTimestamp
					? this.nextStopArrivalTimestamp.getTime() - this.updateTimestamp.getTime()
					: 0;

			if (waitTimeEstimate < 0) {
				console.log('ERROR: negative wait time estimate');
				// debugger;
			}

			// All trains are either N or S (uptown/downtown)
			if (!(this.direction === 'N' || this.direction === 'S')) {
				throw 'Invalid train direction: ' + this.direction;
			}

			const trainPos = this.findPosition(waitTimeEstimate, combinedTrackSections, stations);

			if (!trainPos?.latitude || !trainPos?.longitude) {
				throw 'Error finding lat/long.';
			}

			if (
				(this.marker && this.latitude != trainPos.latitude) ||
				this.longitude != trainPos.longitude
			) {
				this.move = true;
			}

			this.latitude = trainPos.latitude;
			this.longitude = trainPos.longitude;
			// this.intermediateDestinations = trainPos.intermediateDestinations;
		} catch (error) {
			console.log('Error locating train:', error);
		}
	}

	findPosition(
		waitTimeEstimate: number,
		combinedTrackSections: {
			[key: string]: { [key: string]: TrackSection };
		},
		stations: {
			[key: string]: Station;
		}
	) {
		const N = this.direction === 'N';
		const lineColors: { [key in LineName]?: LineColor } = {};
		// 🚸 This is repeated in App.svelte
		lineGroups.forEach((i) => {
			i.lines.forEach((j) => {
				lineColors[j] = i.color;
			});
		});

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
		const directionTrackSectionOffsetIndex = N ? 0 : 1;
		const directionOffset = N ? -1 : 1; // "S" if not "N"

		try {
			// Confirm route is valid:
			if (!lineStationIds[this.routeId]) {
				throw 'Invalid routeId: ' + this.routeId;
			}

			// Locate train between two stations based on the direction and the nextStation
			let nextStation = stations[this.nextStopId];
			let nextStationIndex = lineStationIds[this.routeId].indexOf(String(nextStation?.stopId));
			if (nextStationIndex == -1) {
				throw `Can't find next station in line. (${nextStation?.stopId}, nextStopId: ${this.nextStopId}, ${this.routeId})`;
			}
			let prevStation;
			let prevStationIndex;

			// Previous Station index will be different relative to next
			// Station depending on direction of train.
			prevStationIndex = nextStationIndex - directionOffset;

			if (
				!prevStation &&
				prevStationIndex >= 0 && // nextStation is first in array, direction is "S"
				prevStationIndex < lineStationIds[this.routeId].length // nextStation is last, direction is "N"
			) {
				const prevStationId = lineStationIds[this.routeId][prevStationIndex];
				prevStation = stations[prevStationId];
			}

			const current = new Date(this.updateTimestamp ?? 0).getTime();
			const start = new Date(this.data.trip_start_timestamp_string ?? 0).getTime();

			if (current === start) {
				throw `${this.id} has not started trip`;
			}

			if (!prevStation) {
				throw "Can't find previous station";
			}

			// Set the order of the nextStation and prevStation based on whether
			// the train is going N or S. The order will be used to look up the
			// current interval which has the nStation as the first key and the
			// sStation as the second key.
			const establish =
				(bound: TrainDirection) =>
				(direction: TrainDirection | null) =>
				(aStation: string, bStation: string) => {
					return bound === direction ? [aStation, bStation] : [bStation, aStation];
				};
			const [nStationId, sStationId] = establish('N')(this.direction)(
				nextStation.stopId,
				prevStation.stopId
			);

			// Find interval based on nStation and sStation from nextStation and prevStation
			// and retrieve what was previously the currentInterval
			const interval = combinedTrackSections[nStationId][sStationId];
			const intervalLineColorOffsets = interval?.offsets[lineColor];

			let lastUpdateTrackSection, lastUpdateNextPointIndex, lastUpdateTrackSectionPoints;
			if (this.currentTrackSection) {
				lastUpdateTrackSection = this.currentTrackSection;
				lastUpdateNextPointIndex = this.currentTrackSectionNextPointIndex; // saving because property will be overwritten
				const lastUpdateTrackSectionLineColorOffsets = lastUpdateTrackSection.offsets[lineColor];
				lastUpdateTrackSectionPoints =
					lastUpdateTrackSectionLineColorOffsets[directionTrackSectionOffsetIndex];
			}

			this.currentTrackSection = interval;

			let progress = this.getProgress(waitTimeEstimate);
			// Don't let trains go backwards on the same interval
			// even if progress goes down
			if (lastUpdateTrackSection && lastUpdateTrackSection.id === interval.id) {
				if (progress < this.progress) {
					progress = this.progress;
				}
			}
			// Save progress for next tick to compare.
			this.progress = progress;
			// Progress through the current interval's total distance
			const progressDistance = progress * (interval?.totalDistance ?? 0);

			let nextPoint, nextPointIndex, prevPoint, prevPointIndex, pointProgress;
			if (!this.direction) {
				throw 'Invalid direction.';
			}
			const lastPointIndex = interval?.distances[this.direction].length - 1;
			const penultimatePointIndex = lastPointIndex - 1;
			if (progress === 1) {
				// Train has reached exactly the end of the interval (0 seconds)
				nextPointIndex = N ? 0 : lastPointIndex;
				prevPointIndex = N ? 1 : penultimatePointIndex;
				pointProgress = 1;
			} else if (progress === 0) {
				// Train has reached exactly the beginning of the interval
				// (reported wait time matches estimate)
				nextPointIndex = N ? penultimatePointIndex : 1;
				prevPointIndex = N ? lastPointIndex : 0;
				pointProgress = 0;
			} else {
				// Find the last point in the interval the train passed
				// 🚸 Double check this
				prevPointIndex = interval.distances[this.direction].reduce(
					(prevPointIndex, distance, index) => {
						if (N) {
							return distance < progressDistance ? prevPointIndex : index + 1;
						} else {
							return distance > progressDistance ? prevPointIndex : index;
						}
					},
					0
				);

				nextPointIndex = prevPointIndex + directionOffset;

				// console.log({ intervalLineColorOffsets, prevPointIndex });
				if (!intervalLineColorOffsets?.[prevPointIndex]) {
					// debugger;
				}
				// Save that point as lat/lng
				prevPoint = intervalLineColorOffsets?.[prevPointIndex][directionTrackSectionOffsetIndex];

				// Find how far in distance the train has progressed between prev  and next points
				const prevDistance = interval.distances[this.direction][prevPointIndex];
				const nextDistance = interval.distances[this.direction][nextPointIndex];
				const dNextPrev = nextDistance - prevDistance;
				const dCurrentPrev = progressDistance - prevDistance;
				pointProgress = dCurrentPrev / dNextPrev;

				//console.log(`The previous point was index ${prevPointIndex} at distance ${prevDistance}, the next point is index ${nextPointIndex} at distance ${nextDistance}`);
				//console.log(`The distance between those two is ${dNextPrev} and the distance between the train and the previous is ${dCurrentPrev}`);

				// 🚸 Saw NaN point progress
				if (Number.isNaN(pointProgress) || pointProgress < 0) {
					debugger;
				}
			}

			// 🚸 This was happening sometimes
			if (!intervalLineColorOffsets?.[nextPointIndex]) {
				// debugger;
			}

			nextPoint = intervalLineColorOffsets?.[nextPointIndex][directionTrackSectionOffsetIndex];
			this.currentTrackSectionNextPointIndex = nextPointIndex;

			// If train is at exactly the end of the interval there is no previous point
			let trainPos;
			if (!prevPoint) {
				trainPos = nextPoint;
			} else if (!nextPoint) {
				// 🍄 Don't think this happens
				trainPos = prevPoint;
			} else {
				// Otherwise weight an average between the nextPoint and prevPoint based on
				// point progress
				const dLat = pointProgress * (nextPoint[0] - prevPoint[0]);
				const dLong = pointProgress * (nextPoint[1] - prevPoint[1]);
				trainPos = [prevPoint[0] + dLat, prevPoint[1] + dLong];
			}

			// ✍️console.log(`⛺️ ${this.id} -- Interval: ${interval.id}, progress: ${progress}, nextPoint: ${nextPointIndex}, pointProgress: ${pointProgress}`);

			// Find every point on the track that the train is on between what was previously
			// the next point and what the current location is and save in intermediateDestinations.
			let intermediateDestinations: {
				latitude: number | undefined;
				longitude: number | undefined;
				index: number;
				interval: string;
				distance?: number;
			}[] = [];
			let intermediatePoints = [];

			// If this is the first time we have seen the train there is no previousInterval.
			if (lastUpdateTrackSection) {
				// ✍️console.log(this.id, `🕰 lastUpdateTrackSection: ${lastUpdateTrackSection.id}`);
				// Train is not still in the same interval
				if (lastUpdateTrackSection.id !== interval.id) {
					// ✍️console.log(this.id, `🏡 in new interval (${interval.id}), previous was ${lastUpdateInterval.id}`);
					// Add the rest of the points in the interval it was in
					const lastIndex = N ? 0 : lastUpdateTrackSection.distances[this.direction].length - 1;
					const pointsFromLastUpdateInterval = lastUpdateTrackSection.getPoints(
						lineColor,
						this.direction,
						lastUpdateNextPointIndex,
						lastIndex
					);
					intermediateDestinations = intermediateDestinations.concat(pointsFromLastUpdateInterval);
					intermediatePoints.push(
						`${lastUpdateNextPointIndex} to ${lastIndex} from ${lastUpdateTrackSection.id}`
					);
					// ✍️console.log(`💎 ${this.id} finishing interval from %c${lastUpdateNextPointIndex}%c to %c${lastIndex}%c`, "color: red;", "color: black;", "color: red;", "color: black;")
					// ✍️console.log("💚", this.id, intermediatePoints);
					// ✍️console.log(this.id, intermediateDestinations.length, intermediateDestinations)

					// 🧱 Find the rest of the intervals we may have passed and add their points
					const intermediateIntervals = [];
					const ciNStopId = interval.nStation.stopId;
					const cNStationIndex = lineStationIds[this.routeId].indexOf(ciNStopId);
					const luiNStopId = lastUpdateTrackSection.nStation.stopId;
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
							!combinedTrackSections[piNStationStopId] ||
							!combinedTrackSections[piNStationStopId][piSStationStopId]
						) {
							console.log('Invalid Interval!');
							// What seems to happen here is that the previous update
							// gave incorrect data.
							// 🚸 Maybe remove train?
							debugger;
						}
						const prevInterval = combinedTrackSections[piNStationStopId][piSStationStopId];
						// ✍️console.log(`🔋 ${this.id} -- Looping intervals: N: ${piNStationStopId} (${stations[piNStationStopId].name}), S: ${piSStationStopId} (${stations[piSStationStopId].name}), Interval: ${prevInterval ? prevInterval.id : 'Invalid Interval'}`);
						if (!prevInterval) {
							debugger;
						}
						// ✍️console.log(`🌋 ${this.id} -- Also passed interval ${prevInterval.id}`)
						// If this is the current interval:
						const startIndex = N ? prevInterval.distances[this.direction].length - 1 : 0;
						let endIndex = N ? 0 : prevInterval.distances[this.direction].length - 1;
						if (interval.id === prevInterval.id) {
							endIndex = prevPointIndex;
						}
						intermediateDestinations = intermediateDestinations.concat(
							prevInterval.getPoints(lineColor, this.direction, startIndex, endIndex)
						);
						intermediatePoints.push(`${startIndex} to ${endIndex} from ${prevInterval.id}`);
					}
				} else {
					// Still in the same interval but may have passed points:
					if (lastUpdateNextPointIndex ?? Infinity < nextPointIndex) {
						intermediateDestinations = intermediateDestinations.concat(
							interval.getPoints(
								lineColor,
								this.direction,
								lastUpdateNextPointIndex ?? Infinity,
								prevPointIndex
							)
						);
						intermediatePoints.push(
							`${lastUpdateNextPointIndex} to ${prevPointIndex} from ${interval.id}`
						);
						// ✍️console.log(`🛢 ${this.id} moving withing interval from %c${lastUpdateNextPointIndex}%c to %c${prevPointIndex}%c`, "color: red;", "color: black;", "color: red;", "color: black;")
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
				latitude: trainPos?.[0],
				longitude: trainPos?.[1],
				index: (prevPointIndex + nextPointIndex) / 2,
				interval: interval?.id
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
				intermediateDestinations = intermediateDestinations.slice(
					1,
					intermediateDestinations.length
				);
			}

			return {
				latitude: trainPos?.[0],
				longitude: trainPos?.[1],
				intermediateDestinations: intermediateDestinations
			};
		} catch (error) {
			console.log('Error finding train location:\n', error);
			return null;
		}
	}

	// Calculate the train's progress based on the current wait time to the next
	// station and the average (or max) wait time for that interval.
	// TODO currently most lines have wait times hard coded to 2 minutes
	getProgress(waitTimeEstimate: number) {
		if (!this.routeId || !this.nextStopId || !this.direction) return 0;
		// TODO Don't have stationWaitTimes for all routes
		const waitTimes = stationWaitTimes?.[this.routeId]?.[this.nextStopId]?.[this.direction] ?? {
			avg: 120,
			max: 120
		};
		let progressRemaining = waitTimeEstimate / waitTimes.avg;
		// Wait time is longer than average
		if (progressRemaining > 1) {
			progressRemaining = waitTimeEstimate / waitTimes.max;
		}
		// Wait time is longer than max seen
		if (progressRemaining > 1) {
			progressRemaining = 1;
		}

		const progress = 1 - progressRemaining;
		return progress;
	}
}
