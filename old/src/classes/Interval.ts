import Victor from "victor";
import Station from "../classes/Station";
import type { LineColor, LineGroupIntervals, TrainDirection } from "../types";
const trackDistance = 25; // Meters
const METER_LNG_OFFSET = 0.000011855720423170624;
const METER_LAT_OFFSET = 0.000008983152841324227;

export default class Interval {
  id: string;
  nStation: Station;
  sStation: Station;
  colors: LineColor[];
  shape: [number, number][];
  offsets: { [key in LineColor]?: [number, number][][] };
  distances: { N: number[]; S: number[] };
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
    this.distances = { N: [], S: [] };
    this.totalDistance = 0;
  }

  static combineIntervals(
    lineGroupIntervals: LineGroupIntervals,
    stations: { [key: string]: Station }
  ): {
    [key: string]: {
      [key: string]: Interval;
    };
  } {
    // Object to store combined intervals, key is
    // nStation.stopId
    const combinedIntervals: {
      [key: string]: {
        [key: string]: Interval;
      };
    } = {};
    // Loop over each set of logged intervals organized by line color
    Object.keys(lineGroupIntervals).forEach((_color) => {
      const color = _color as LineColor;
      // Loop over each logged interval for the color
      lineGroupIntervals[color].forEach((intervalData) => {
        // Get station objects from stations
        const nStationId = intervalData[0];
        const sStationId = intervalData[1];
        const nStation = stations[nStationId];
        const sStation = stations[sStationId];

        const intervalInMap =
          combinedIntervals[nStation.stopId]?.[sStation.stopId];
        if (intervalInMap) {
          intervalInMap.colors.push(color);
        } else {
          // Otherwise create Interval object
          // 🚸 Could find next interval and add first point (or second?) of that interval to shape so points meet.
          const shape = intervalData[4];
          const numberShape = shape.map((i) => i.map(parseFloat)) as [
            number,
            number
          ][];
          // Add in station lat/longs
          // 🍄 Not sure why this needs to happen
          const first = numberShape[0];
          const last = numberShape[numberShape.length - 1];
          if (
            // 🍄 is this necessary?
            !shape[0] ||
            (first?.[0] !== nStation.latitude &&
              first?.[1] !== nStation.longitude)
          ) {
            numberShape.unshift([nStation.latitude, nStation.longitude]);
          }

          if (
            last?.[0] !== sStation.latitude &&
            last?.[1] !== sStation.longitude
          ) {
            numberShape.push([sStation.latitude, sStation.longitude]);
          }
          const interval = new Interval(
            nStation,
            sStation,
            [color],
            numberShape
          );
          // Add new interval to combinedIntervals
          if (!combinedIntervals[nStation.stopId]) {
            combinedIntervals[nStation.stopId] = {};
          }
          combinedIntervals[nStation.stopId][sStation.stopId] = interval;
        }
      });
    });

    // Loop over combinedIntervals to create offsetShapes:
    Object.keys(combinedIntervals).forEach((nStationId) => {
      Object.keys(combinedIntervals[nStationId]).forEach((sStationId) => {
        const interval = combinedIntervals[nStationId][sStationId];
        // 🚸 IDK why I'm using trackDistance as a param here even though the functions are in the same file.
        const offsets = Interval.mapPointsToOffsets(
          interval.shape,
          trackDistance,
          interval.colors
        );
        interval.offsets = offsets;
        interval.calculateDistances();
      });
    });

    return combinedIntervals;
  }

  calculateDistances() {
    const toVector: (xy: [number, number]) => Victor = ([x, y]) =>
      new Victor(x, y);
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
      const distanceFromPreviousPoint = previousPoint
        ? previousPoint.distance(point)
        : 0;
      const distanceElapsed = previousPoint ? distancesElapsed[index - 1] : 0;
      distancesElapsed.push(distanceElapsed + distanceFromPreviousPoint);
      return distancesElapsed;
    };

    const sDistances = shapeVectors.reduce(shapeToDistances, []);
    const nDistances = [...shapeVectors]
      .reverse()
      .reduce(shapeToDistances, [])
      .reverse();
    this.distances = { N: nDistances, S: sDistances };
    this.totalDistance = nDistances[0];
  }

  static mapPointsToOffsets(
    shape: [number, number][],
    trackDistance: number,
    colors: LineColor[]
  ): { [key in LineColor]?: [number, number][][] } {
    // For each color return an array of pairs (each side of the shape line) of
    // offset points(which are pairs of coordinates) that map to each pair of
    // coordinates from the shape.
    const colorOffsetPoints: {
      [key in LineColor]?: ([number, number][] | null)[];
    } = {};
    colors.forEach((color, index) => {
      // Calculate the distance from the track shape center line each of the pair
      // of each color's "tracks" should be. The placing depends on if there are
      // an even number or odd number of colors running on that interval.
      const numberOfColors = colors.length;
      let colorDistances: [number, number];
      let base;
      const side = index % 2 === 0 ? 1 : -1;
      const adjustment = trackDistance / 2;
      const evenNumberOfColors = numberOfColors % 2 === 0;
      if (evenNumberOfColors) {
        base = trackDistance * (Math.floor(index / 2) * 2 + 1);
        colorDistances = [
          side * (base - adjustment),
          side * (base + adjustment),
        ];
      } else {
        // On first index pair down the middle:
        if (index === 0) {
          colorDistances = [trackDistance / 2, -trackDistance / 2];
        } else {
          base = trackDistance * (Math.ceil(index / 2) * 2);
          colorDistances = [
            side * (base - adjustment),
            side * (base + adjustment),
          ];
        }
      }

      // // 🍄 could this use map or reduce?
      // const colorOffsetPoints: {
      //   [key in LineColor]: [number, number][][];
      // } = _colorOffsetPoints as {
      //   [key in LineColor]: [number, number][][];
      // };

      // Map the shape's points to a pair of sets of points for each color
      // offset by a certain distance.
      const colorOffsetPoint = shape.map((pointB, index) => {
        let pointA = null;
        let pointC = null;
        // 🍄 could this use optional chaining?
        if (index > 0) {
          pointA = shape[index - 1];
        }
        if (index < shape.length - 1) {
          pointC = shape[index + 1];
        }

        const op = Interval.findOffsetPoints(
          pointA,
          pointB,
          pointC,
          colorDistances
        );
        return op?.filter((i) => i !== null) ?? [];
      });

      colorOffsetPoints[color] = colorOffsetPoint;
      // If previous and next station are an equal distance from
      // the middle station, and at opposite angles, the vector
      // will be of magnitude 0, findOffsetPoints will return
      // null instead of a pair of coordinates for each distance.
      // This step replaces those null values with the previous non
      // null value since it would be a straight line to the next not
      // null value anyway.
      colorOffsetPoints[color] = colorOffsetPoints[color]?.map((i, index) => {
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
            [nonNullShape[1][0], nonNullShape[1][1]],
          ];
        }
        return i;
      });

      // // Reverse direction of S bound offset shapes:
      // const sOffsetPoints = colorOffsetPoints[color].map(i => i[1]);
      // sOffsetPoints.reverse();
      // colorOffsetPoints[color] = colorOffsetPoints[color].map((i, index) => {
      //   i[1] = sOffsetPoints[index];
      //   return i;
      // });
    });

    // 🍄 Type assertion
    return colorOffsetPoints as { [key in LineColor]: [number, number][][] };
  }

  static findOffsetPoints(
    pointA: [number, number] | null,
    pointB: [number, number],
    pointC: [number, number] | null,
    offsetLengthsMeters: [number, number]
  ): [number, number][] | null {
    const pos: {
      a: [number, number] | null;
      b: [number, number] | null;
      c: [number, number] | null;
    } = {
      a: null,
      b: null,
      c: null,
    };
    pos.a = pointA || null;
    pos.b = pointB;
    pos.c = pointC || null;
    // Distance between points A & B and points B & C in meters:
    let dLatAB: number, dLngAB: number, dLatCB: number, dLngCB: number;
    [dLatAB, dLngAB] = Interval.dLatLng(pointB, pointA);
    [dLatCB, dLngCB] = Interval.dLatLng(pointB, pointC);
    // Turn distances into vectors using Victor: http://victorjs.org/
    const abVector = new Victor(dLatAB, dLngAB);
    const cbVector = new Victor(dLatCB, dLngCB);
    // Point B is last in interval shape:
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

      const pointBNOffset = Interval.offsetFromPoint(
        pos.b[0],
        pos.b[1],
        offsetAVector.x,
        offsetAVector.y,
        -offsetLengthsMeters[1]
      );
      const pointBSOffset = Interval.offsetFromPoint(
        pos.b[0],
        pos.b[1],
        offsetAVector.x,
        offsetAVector.y,
        -offsetLengthsMeters[0]
      );
      return [pointBSOffset, pointBNOffset];

      // Point B is first in interval shape:
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
      const pointBSOffset = Interval.offsetFromPoint(
        pos.b[0],
        pos.b[1],
        offsetCVector.x,
        offsetCVector.y,
        offsetLengthsMeters[0]
      );
      const pointBNOffset = Interval.offsetFromPoint(
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

    // Create 2 points, each of the offsetLenghts away from Point B
    // where the angles bisect the lines to Points A and C:
    const nPos = Interval.offsetFromPoint(
      pos.b[0],
      pos.b[1],
      offsetBVectorNormal.x,
      offsetBVectorNormal.y,
      offsetLengthsMeters[0]
    );
    const sPos = Interval.offsetFromPoint(
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
    const latOffset =
      METER_LAT_OFFSET * normalizedOffsetMetersX * offsetLengthMeters;
    const lngOffset =
      METER_LNG_OFFSET * normalizedOffsetMetersY * offsetLengthMeters;
    const lat = pointLat + latOffset;
    const lng = pointLng + lngOffset;
    return [lat, lng];
  }

  // Extrat lat/lng and convert to meters:
  // 🍄 Lat/Lng type?
  static dLatLng(s0: [number, number] | null, s1: [number, number] | null) {
    if (!s0 || !s1) return [0, 0];
    const latDiff = s1[0] - s0[0];
    const lngDiff = s1[1] - s0[1];
    return [latDiff / METER_LAT_OFFSET, lngDiff / METER_LNG_OFFSET];
  }

  // ☢️ endingIndex is inclusive!
  getPoints(
    color: LineColor,
    direction: TrainDirection,
    sIndex: number = 0,
    eIndex: number = this.distances.N.length - 1
  ) {
    let directionIndex = 1;
    let startingIndex = sIndex;
    let endingIndex = eIndex;
    if (direction === "N") {
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
        interval: this.id,
      }));
    if (direction === "N") {
      points.reverse();
    }

    return points;
  }
}
