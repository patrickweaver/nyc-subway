import Victor from 'victor';
const trackDistance = 20; // Meters

export default class Interval {
  constructor(
    nStation,
    sStation,
    colors,
    shape,
    followingStations={}
  ) {
    this.nStation = nStation;
    this.sStation = sStation;
    this.followingStations = followingStations;
    this.colors = colors;
    this.shape = shape;
    this.offsets = Interval.mapPointsToOffsets(shape, trackDistance, colors);
  }

  static combineIntervals(lineGroupIntervals, stations) {
    // Loop over each set of logged intervals separated by line color
    for (let color in lineGroupIntervals) {
      const colorIntervals = lineGroupIntervals[color];
      // Loop over each logged interval for the color
      colorIntervals.forEach(i => {
        const nStation = stations[i[0]];
        const sStation = stations[i[1]];
        const shape = i[4];
        const sStopIds = nStation.intervals.map(j => j.sStation.stopId);
        
        // Find stations after interval by
        // Filtering current colors intervals to ones where the
        // first station is our current station's second station
        const nextIntervals = i.filter(j => j[0] == sStation.stopId);
        // Find those station objects in stations
        const followingStations = nextIntervals.map(j => stations[j][1]);

        // If interval exists for another color add current color
        const matchIndex = sStopIds.indexOf(sStation.stopId);
        if (matchIndex > -1) {
          const currInter = nStation.intervals[matchIndex];
          currInter.colors.push(color);
          currInter.followingStations[color] = followingStations;
        } else {
          const followingStationsWithColor = {[color]: followingStations};
          // Otherwise make a new interval (this happens if there are currently 0)
          const numberShape = shape.map(i => i.map(parseFloat));
          nStation.intervals.push(new Interval(nStation, sStation, [color], numberShape, followingStationsWithColor));
        }
      })
    }
  }

  static mapPointsToOffsets(shape, distance, colors) {
    // For each color return an array of pairs (each side
    // of the shape line) of offset points (which are
    // pairs of coordinates) that map to each pair of
    // coordinates from the shape.
    const colorOffsetPoints = {};
    colors.forEach((color, index) => {
      const colorDistance = distance * (index + 1);
      colorOffsetPoints[color] = shape.map((pointB, index) => {
        let pointA = null;
        let pointC = null;
        if (index > 0) {
          pointA = shape[index - 1];
        }
        if (index < shape.length - 1) {
          pointC = shape[index + 1];
        }
        return Interval.findOffsetPoints(pointA, pointB, pointC, distance);
      });
    })
    return colorOffsetPoints;
  }

  static findOffsetPoints(pointA, pointB, pointC, offsetLengthMeters) {
  
    const pos = {};
    pos.a = pointA || null;
    pos.b = pointB || null;
    pos.c = pointC || null;
    // Distance between points A & B and points B & C in meters:
    let dLatAB, dLngAB, dLatCB, dLngCB;
    [dLatAB, dLngAB] = Interval.dLatLng(pointB, pointA);
    [dLatCB, dLngCB] = Interval.dLatLng(pointB, pointC);
    // Turn distances into vectors using Victor: http://victorjs.org/
    const abVector = new Victor(dLatAB, dLngAB);
    const cbVector = new Victor(dLatCB, dLngCB);
  
    // Point B is last in interval shape:
    if (!pointC) {
      const offsetAVector = abVector.clone().normalize().rotate(Math.PI / 2);
      pointB.nOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, offsetLengthMeters);
      pointB.sOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, -offsetLengthMeters);
      return [pointB.nOffset, pointB.sOffset];
  
      // Point B is first in interval shape:
    } else if (!pointA) {
      const offsetCVector = cbVector.clone().normalize().rotate(Math.PI / 2);

      // Swap N and S for first point:
      pointB.sOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, offsetLengthMeters);
      pointB.nOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, -offsetLengthMeters);
      return [pointB.nOffset, pointB.sOffset];
    }
  
    // Create equal magnitude vectors with the same directions:
    const abVectorEqLen = abVector.clone().multiply(new Victor(cbVector.length(), cbVector.length()));
    const cbVectorEqLen = cbVector.clone().multiply(new Victor(abVector.length(), abVector.length()));
  
    // Create new vector of magnitude 1 meter that bisects abVector and cbVector:
    const offsetBVector = abVectorEqLen.clone().add(cbVectorEqLen).normalize();

    // Create 2 points on opposite sides of Point B 50 meters away
    // where the angles bisect the lines to Points A and C:
    const oPos = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetBVector.x, offsetBVector.y, offsetLengthMeters);
    const oPosNeg = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetBVector.x, offsetBVector.y, -offsetLengthMeters);
  
    const crossProduct = abVector.cross(cbVector);
    if (crossProduct < 0) {
      return [oPosNeg, oPos];
    } else {
      return [oPos, oPosNeg];
    }
  }

  // Convert meter vector back to Lat/Lng and find offset from set point (Point B):
  static offsetFromPoint(pointLat, pointLng, normalizedOffsetMetersX, normalizedOffsetMetersY, offsetLengthMeters = 1) {
    const lat = pointLat + (METER_LAT_OFFSET * normalizedOffsetMetersX * offsetLengthMeters);
    const lng = pointLng + (METER_LNG_OFFSET * normalizedOffsetMetersY * offsetLengthMeters);
    return [lat, lng];
  }

  // Extrat lat/lng and convert to meters:
  static dLatLng(s0, s1) {
    if (!s0 || !s1) {
      return [0, 0];
    }
    return [
      (s1[0] - s0[0]) / METER_LAT_OFFSET, 
      (s1[1] - s0[1]) / METER_LNG_OFFSET
    ];
  }
}

