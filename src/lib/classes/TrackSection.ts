import Victor from 'victor';
import Station from '$lib/classes/Station';
import type {
	LatLng,
	LineColor,
	LineGroupTrackSection,
	LineGroupTrackSections,
	TrainDirection
} from '$lib/types';
import { METER_LAT_OFFSET, METER_LNG_OFFSET, TRACK_DISTANCE_METERS } from '$lib/constants';
import { lineGroupTrackSections } from '$lib/data/lineGroupTrackSectionsWithShapes';
import { getDistanceFromLatLong } from '$lib/mapping/distance';

const stations = Station.getAllStations();

export default class TrackSection {
	id: string;
	nStation: Station;
	sStation: Station;
	colors: LineColor[];
	shape: [number, number][];
	offsets: { [key in LineColor]?: [number, number][][] };
	distances: number[];
	totalDistance: number;

	constructor(
		nStation: Station,
		sStation: Station,
		colors: LineColor[],
		shape: [number, number][]
		//followingStations={}
	) {
		this.id = `${nStation.stopId}__${sStation.stopId}`;
		this.nStation = nStation;
		this.sStation = sStation;
		//this.followingStations = followingStations;
		this.colors = colors;
		this.shape = shape;
		this.offsets = {};
		this.distances = [];
		this.totalDistance = 0;
	}

	static getAllTrackSections() {
		let trackSections: {
			[key: string]: { [key: string]: TrackSection };
		} = {};

		// Loop over each set of track sections organized by line color
		Object.keys(lineGroupTrackSections).forEach((_color) => {
			const color = _color as LineColor;
			lineGroupTrackSections[color].forEach((trackSectionData) => {
				// Get station objects from stations
				const nStationId = trackSectionData[0];
				const sStationId = trackSectionData[1];

				const existingTrackSection = trackSections[nStationId]?.[sStationId];
				if (!!existingTrackSection) {
					existingTrackSection.colors.push(color);
					return;
				}

				const nStation = stations[nStationId];
				const sStation = stations[sStationId];
				const trackSection = this.createTrackSection(trackSectionData, nStation, sStation, color);

				if (!trackSections[nStation.stopId]) {
					trackSections[nStation.stopId] = {};
				}
				trackSections[nStation.stopId][sStation.stopId] = trackSection;
			});
		});

		// Loop over combinedTrackSections to create offsetShapes for each line:
		Object.keys(trackSections).forEach((nStationId) => {
			Object.keys(trackSections[nStationId]).forEach((sStationId) => {
				const trackSection = trackSections[nStationId][sStationId];
				trackSection.mapPointsToOffsets();
				trackSection.calculateDistances();
			});
		});

		return trackSections;
	}

	static createTrackSection(
		intervalData: LineGroupTrackSection,
		nStation: Station,
		sStation: Station,
		color: LineColor
	): TrackSection {
		// Otherwise create TrackSection object
		// 🚸 Could find next TrackSection and add first point (or second?) of that TrackSection to shape so points meet.
		const shape = intervalData[4];
		const numberShape = shape.map((i) => i.map(parseFloat)) as [number, number][];
		// Add in station lat/longs
		// 🍄 Not sure why this needs to happen
		const first = numberShape[0];
		const last = numberShape[numberShape.length - 1];
		if (
			// 🍄 is this necessary?
			!shape[0] ||
			(first?.[0] !== nStation.latitude && first?.[1] !== nStation.longitude)
		) {
			numberShape.unshift([nStation.latitude, nStation.longitude]);
		}

		if (last?.[0] !== sStation.latitude && last?.[1] !== sStation.longitude) {
			numberShape.push([sStation.latitude, sStation.longitude]);
		}
		const trackSection = new TrackSection(nStation, sStation, [color], numberShape);

		return trackSection;
	}

	calculateDistances() {
		const toVector: (xy: [number, number]) => Victor = ([x, y]) => new Victor(x, y);
		const shapeVectors = this.shape.map(toVector);

		// Function to reduce shape points to array of the cumulative distances
		// between each of them
		const shapeToDistances = (
			distancesElapsed: number[],
			point: Victor,
			index: number,
			shapeVectors: Victor[]
		) => {
			const previousPoint = index > 0 ? shapeVectors[index - 1] : null;
			const distanceFromPreviousPoint = previousPoint ? previousPoint.distance(point) : 0;
			const distanceElapsed = previousPoint ? distancesElapsed[index - 1] : 0;
			distancesElapsed.push(distanceElapsed + distanceFromPreviousPoint);
			return distancesElapsed;
		};

		const distances = shapeVectors.reduce(shapeToDistances, []);
		this.distances = distances;
		// TODO fallback not possible
		this.totalDistance = distances.at(-1) ?? 0;
	}

	mapPointsToOffsets() {
		// For each line color in the track section return an array of
		// coordinate pairs (each side of the shape line) of offset points
		// that map to each pair of coordinates from the shape.
		const colorOffsetPoints: {
			[key in LineColor]?: [number, number][][];
		} = {};
		this.colors.forEach((color, index) => {
			// Calculate the distance from the track shape center line each of
			// the pair of each color's "tracks" should be. The placing depends
			// on if there are an even number or odd number of colors running
			// on that track section.
			const numberOfColors = this.colors.length;
			let colorDistances: [number, number];
			let base;
			const side = index % 2 === 0 ? 1 : -1;
			const adjustment = TRACK_DISTANCE_METERS / 2;
			const evenNumberOfColors = numberOfColors % 2 === 0;
			if (evenNumberOfColors) {
				base = TRACK_DISTANCE_METERS * (Math.floor(index / 2) * 2 + 1);
				colorDistances = [side * (base - adjustment), side * (base + adjustment)];
			} else {
				// On first index pair down the middle:
				if (index === 0) {
					colorDistances = [TRACK_DISTANCE_METERS / 2, -TRACK_DISTANCE_METERS / 2];
				} else {
					base = TRACK_DISTANCE_METERS * (Math.ceil(index / 2) * 2);
					colorDistances = [side * (base - adjustment), side * (base + adjustment)];
				}
			}

			// Map the shape's points to two sets (North/South) of coordinates
			// for each color offset by the specified distance.
			const colorOffsetPoint = this.shape.map((pointB, index) => {
				let pointA = null;
				let pointC = null;
				const firstIndex = 0;
				const lastIndex = this.shape.length - 1;
				if (index > firstIndex) {
					pointA = this.shape[index - 1];
				}
				if (index < lastIndex) {
					pointC = this.shape[index + 1];
				}
				const op = TrackSection.findOffsetPoints(pointA, pointB, pointC, colorDistances);
				return op?.filter((i) => i !== null) ?? [];
			});

			// If previous and next station are an equal distance from
			// the middle station, and at opposite angles, the vector
			// will be of magnitude 0, findOffsetPoints will return
			// null instead of a pair of coordinates for each distance.
			// This step replaces those null values with the previous non
			// null value since it would be a straight line to the next not
			// null value anyway.
			const fixedColorOffsetPoint: [number, number][][] = colorOffsetPoint?.map((i, index) => {
				const oShape = colorOffsetPoints[color];
				if (i === null) {
					let prevNotNullRelativeIndex = 0;
					while (!oShape?.[index - prevNotNullRelativeIndex]) {
						prevNotNullRelativeIndex += 1;
					}
					const notNullIndex = index - prevNotNullRelativeIndex;
					// 🍄 can this type assertion be fixed?
					const nonNullShape = oShape[notNullIndex] as [number, number][];
					return [
						[nonNullShape[0][0], nonNullShape[0][1]],
						[nonNullShape[1][0], nonNullShape[1][1]]
					];
				}
				return i;
			});
			colorOffsetPoints[color] = fixedColorOffsetPoint;

			// // Reverse direction of S bound offset shapes:
			// const sOffsetPoints = colorOffsetPoints[color].map((i) => i[1]);
			// sOffsetPoints.reverse();
			// colorOffsetPoints[color] = colorOffsetPoints[color].map((i, index) => {
			// 	i[1] = sOffsetPoints[index];
			// 	return i;
			// });
		});

		// TODO Type assertion
		this.offsets = colorOffsetPoints as { [key in LineColor]: [number, number][][] };
	}

	static findOffsetPoints(
		pointA: LatLng | null,
		pointB: LatLng,
		pointC: LatLng | null,
		offsetLengthsMeters: [number, number]
	): [number, number][] | null {
		const pos: { a: LatLng | null; b: LatLng | null; c: LatLng | null } = {
			a: null,
			b: null,
			c: null
		};
		pos.a = pointA || null;
		pos.b = pointB;
		pos.c = pointC || null;
		// Distance between points A & B and points B & C in meters:
		let dLatAB: number, dLngAB: number, dLatCB: number, dLngCB: number;
		[dLatAB, dLngAB] = getDistanceFromLatLong(pointB, pointA);
		[dLatCB, dLngCB] = getDistanceFromLatLong(pointB, pointC);
		// Turn distances into vectors using Victor: http://victorjs.org/
		const abVector = new Victor(dLatAB, dLngAB);
		const cbVector = new Victor(dLatCB, dLngCB);
		// Point B is last in TrackSection shape:
		if (!pointC) {
			// 🍄 Combine points into an object with two type signatures?
			pointA!;
			const offsetAVector = abVector
				.clone()
				.normalize()
				.rotate(Math.PI / 2);

			if (offsetAVector.horizontalAngle() < 0) {
				offsetAVector.rotate(Math.PI);
			}

			const pointBNOffset = TrackSection.offsetFromPoint(
				pos.b[0],
				pos.b[1],
				offsetAVector.x,
				offsetAVector.y,
				-offsetLengthsMeters[1]
			);
			const pointBSOffset = TrackSection.offsetFromPoint(
				pos.b[0],
				pos.b[1],
				offsetAVector.x,
				offsetAVector.y,
				-offsetLengthsMeters[0]
			);
			return [pointBSOffset, pointBNOffset];

			// Point B is first in TrackSection shape:
		} else if (!pointA) {
			pointC!;
			const offsetCVector = cbVector
				.clone()
				.normalize()
				.rotate(Math.PI / 2);

			if (offsetCVector.horizontalAngle() > 0) {
				offsetCVector.rotate(Math.PI);
			}

			// Swap N and S for first point:
			const pointBSOffset = TrackSection.offsetFromPoint(
				pos.b[0],
				pos.b[1],
				offsetCVector.x,
				offsetCVector.y,
				offsetLengthsMeters[0]
			);
			const pointBNOffset = TrackSection.offsetFromPoint(
				pos.b[0],
				pos.b[1],
				offsetCVector.x,
				offsetCVector.y,
				offsetLengthsMeters[1]
			);
			return [pointBSOffset, pointBNOffset];
		}

		// Create equal magnitude vectors with the same directions:
		const abVectorEqLen = abVector
			.clone()
			.multiply(new Victor(cbVector.length(), cbVector.length()));
		const cbVectorEqLen = cbVector
			.clone()
			.multiply(new Victor(abVector.length(), abVector.length()));

		// Create new vector of magnitude 1 meter that bisects abVector and cbVector:
		const offsetBVector = abVectorEqLen.clone().add(cbVectorEqLen);
		// If station differences are of equal length and opposite
		// angles just skip the station.
		if (offsetBVector.length() === 0) {
			return null;
		}

		const offsetBVectorNormal = offsetBVector.clone().normalize();

		// Ensure tracks are on the right side of original shape
		if (offsetBVectorNormal.horizontalAngle() > 0) {
			offsetBVectorNormal.rotate(Math.PI);
		}

		// Create 2 points, each of the offsetLengths away from Point B
		// where the angles bisect the lines to Points A and C:
		const nPos = TrackSection.offsetFromPoint(
			pos.b[0],
			pos.b[1],
			offsetBVectorNormal.x,
			offsetBVectorNormal.y,
			offsetLengthsMeters[0]
		);
		const sPos = TrackSection.offsetFromPoint(
			pos.b[0],
			pos.b[1],
			offsetBVectorNormal.x,
			offsetBVectorNormal.y,
			offsetLengthsMeters[1]
		);

		const crossProduct = abVector.cross(cbVector);
		return [nPos, sPos];
		// if (crossProduct < 0) {
		//   return [oPos1, oPos2];
		// } else {
		//   return [oPos2, oPos1];
		// }
	}

	// Convert meter vector back to Lat/Lng and find offset from set point (Point B):
	static offsetFromPoint(
		pointLat: number,
		pointLng: number,
		normalizedOffsetMetersX: number,
		normalizedOffsetMetersY: number,
		offsetLengthMeters: number = 1
	): [number, number] {
		const latOffset = METER_LAT_OFFSET * normalizedOffsetMetersX * offsetLengthMeters;
		const lngOffset = METER_LNG_OFFSET * normalizedOffsetMetersY * offsetLengthMeters;
		const lat = pointLat + latOffset;
		const lng = pointLng + lngOffset;
		return [lat, lng];
	}

	// ☢️ endingIndex is inclusive!
	getPoints(
		color: LineColor,
		direction: TrainDirection,
		sIndex: number = 0,
		eIndex: number = this.distances.length - 1
	) {
		let directionIndex = 1;
		let startingIndex = sIndex;
		let endingIndex = eIndex;
		if (direction === 'N') {
			directionIndex = 0;
			startingIndex = eIndex;
			endingIndex = sIndex;
		}

		let points = (this.offsets[color] ?? [])
			.map((i, index) => {
				const ii = [...i[directionIndex]];
				ii.push(index);
				return ii;
			})
			.filter((i, index) => index >= startingIndex && index <= endingIndex)
			.map((i) => ({
				latitude: i[0],
				longitude: i[1],
				index: i[2],
				interval: this.id
			}));
		if (direction === 'N') {
			points.reverse();
		}

		return points;
	}

	getNextPrevPoints(
		direction: TrainDirection,
		progress: number,
		lineColor: LineColor
	): {
		next: { point: [number, number]; index: number };
		prev: { point: [number, number]; index: number };
		progress: number;
	} {
		const isNorthbound = direction === 'N';
		const directionTrackSectionOffsetIndex = isNorthbound ? 0 : 1;
		const directionOffset = isNorthbound ? -1 : 1; // "S" if not "N"
		const ultimatePointIndex = this.distances.length - 1;
		const penultimatePointIndex = ultimatePointIndex - 1;
		const arrivedAtEndOfTrackSection = progress === 1;
		const isAtBeginningOfTrackSection = progress === 0;
		let nextPointIndex: number;
		let prevPointIndex: number;
		let pointProgress: number;
		let nextPoint: [number, number];
		let prevPoint: [number, number];

		if (arrivedAtEndOfTrackSection) {
			nextPointIndex = isNorthbound ? 0 : ultimatePointIndex;
			prevPointIndex = isNorthbound ? 1 : penultimatePointIndex;
			pointProgress = 1;
		} else if (isAtBeginningOfTrackSection) {
			nextPointIndex = isNorthbound ? penultimatePointIndex : 1;
			prevPointIndex = isNorthbound ? ultimatePointIndex : 0;
			pointProgress = 0;
		} else {
			const progressDistance = progress * this.totalDistance;
			// Find the last point in the interval the train passed
			// TODO Double check this

			const _prevPointIndex = this.distances.reduce((prevPointIndex, distance, index) => {
				if (isNorthbound) {
					return distance < progressDistance ? prevPointIndex : index + 1;
				} else {
					return distance > progressDistance ? prevPointIndex : index;
				}
			}, 0);

			const distanceProgress = this.totalDistance * progress;
			const passedPoints = this.distances.filter((distance) => distance <= distanceProgress);
			prevPointIndex = passedPoints.length - 1;

			console.log(
				'*** DEBUG\n',
				this.distances,
				progress,
				distanceProgress,
				direction,
				_prevPointIndex,
				prevPointIndex
			);

			nextPointIndex = prevPointIndex + directionOffset;

			const intervalLineColorOffsets = this.offsets[lineColor];
			if (!intervalLineColorOffsets?.[nextPointIndex]) {
				throw new Error('TODO_ERROR Invalid nextPointIndex');
			}

			// console.log({ intervalLineColorOffsets, prevPointIndex });
			if (!intervalLineColorOffsets?.[prevPointIndex]) {
				// debugger;
			}
			// Save that point as lat/lng
			prevPoint = intervalLineColorOffsets?.[prevPointIndex][directionTrackSectionOffsetIndex];

			// Find how far in distance the train has progressed between prev  and next points
			const prevDistance = this.distances[prevPointIndex];
			const nextDistance = this.distances[nextPointIndex];
			const dNextPrev = nextDistance - prevDistance;
			const dCurrentPrev = progressDistance - prevDistance;
			// TODO avoid dividing by 0
			pointProgress = dNextPrev !== 0 ? dCurrentPrev / dNextPrev : 0;

			//console.log(`The previous point was index ${prevPointIndex} at distance ${prevDistance}, the next point is index ${nextPointIndex} at distance ${nextDistance}`);
			//console.log(`The distance between those two is ${dNextPrev} and the distance between the train and the previous is ${dCurrentPrev}`);
		}

		const intervalLineColorOffsets = this.offsets[lineColor];
		if (!intervalLineColorOffsets?.[nextPointIndex]) {
			throw new Error('TODO_ERROR Invalid nextPointIndex');
		}

		nextPoint = intervalLineColorOffsets?.[nextPointIndex][directionTrackSectionOffsetIndex];
		prevPoint = intervalLineColorOffsets?.[prevPointIndex][directionTrackSectionOffsetIndex];

		return {
			next: { point: nextPoint, index: nextPointIndex },
			prev: { point: prevPoint, index: prevPointIndex },
			progress: pointProgress
		};
	}

	static getTrackSection(
		nextStation: Station,
		prevStation: Station,
		direction: TrainDirection
	): TrackSection {
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
		const [nStationId, sStationId] = establish('N')(direction)(
			nextStation.stopId,
			prevStation.stopId
		);

		const allTrackSections = TrackSection.getAllTrackSections();

		// Find interval based on nStation and sStation from nextStation and prevStation
		// and retrieve what was previously the currentInterval
		const trackSection = allTrackSections[nStationId][sStationId];
		return trackSection;
	}
}
