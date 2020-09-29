import Victor from 'victor';
const trackDistance = 100; // Meters

export default class Interval {
  constructor(
    nStation,
    sStation,
    colors,
    shape//,
    //followingStations={}
  ) {
    this.nStation = nStation;
    this.sStation = sStation;
    //this.followingStations = followingStations;
    this.colors = colors;
    this.shape = shape;
    this.offsets = [];
  }

  static combineIntervals(lineGroupIntervals, stations) {
    // Object to store combined intervals, key is
    // nStation.stopId
    const combinedIntervals = {};
    // Loop over each set of logged intervals organized by line color
    Object.keys(lineGroupIntervals).forEach(color => {
      // Loop over each logged interval for the color
      lineGroupIntervals[color].forEach(i => {
        // Get station objects from stations
        const nStation = stations[i[0]];
        const sStation = stations[i[1]];
        if (
        // If interval has been seen add current color
          combinedIntervals[nStation.stopId]
          && combinedIntervals[nStation.stopId][sStation.stopId]
        ) {
          combinedIntervals[nStation.stopId][sStation.stopId].colors.push(color);
        } else {
        // Otherwise create Interval object
          // 🚸 Could find next interval and add first point (or second?) of that interval to shape so points meet.
          const shape = i[4];
          const numberShape = shape.map(i => i.map(parseFloat));
          const interval = new Interval(nStation, sStation, [color], numberShape);
          // Add new interval to combinedIntervals
          if (!combinedIntervals[nStation.stopId]) {
            combinedIntervals[nStation.stopId] = {};
          }
          combinedIntervals[nStation.stopId][sStation.stopId] = interval;
        }
      });
    });

    // Loop over combinedIntervals to create offsetShapes:
    Object.keys(combinedIntervals).forEach(nStationId => {
      Object.keys(combinedIntervals[nStationId]).forEach(sStationId => {
        const interval = combinedIntervals[nStationId][sStationId];
        // 🚸 IDK why I'm using trackDistance as a param here even though the functions are in the same file.
        interval.offsets = Interval.mapPointsToOffsets(interval.shape, trackDistance, interval.colors);
      })
    });

    return combinedIntervals;
  }

  static mapPointsToOffsets(shape, trackDistance, colors) {
    // For each color return an array of pairs (each side
    // of the shape line) of offset points (which are
    // pairs of coordinates) that map to each pair of
    // coordinates from the shape.
    const colorOffsetPoints = {};
    colors.forEach((color, index) => {
      console.log({color, index});
      // Calculate the distance from the track shape center line each
      // of the pair of each color's "tracks" should be. The placing
      // depends on if there are an even number or odd number of colors
      // running on that interval.
      const numberOfColors = colors.length;
      let colorDistances;
      let base;
      const side = index % 2 === 0 ? 1 : -1;
      const adjustment = trackDistance / 2;
      // Odd number of colors
      if (numberOfColors % 2 !== 0) {
        // On first index pair down the middle:
        if (index === 0) {
          colorDistances = [trackDistance / 2, -trackDistance / 2];
        } else {
          base = trackDistance * (Math.ceil(index / 2) * 2);
          colorDistances = [side * (base - adjustment), side * (base + adjustment)];
        }
      } else {
      // Even number of colors
        base = trackDistance * ((Math.floor(index / 2) * 2) + 1)
        colorDistances = [side * (base - adjustment), side * (base + adjustment)];
      }
      console.log({base, colorDistances})
      
      // Map the shape's points to a pair of sets of points for each color
      // offset by a certain distance.
      colorOffsetPoints[color] = shape.map((pointB, index) => {
        let pointA = null;
        let pointC = null;
        if (index > 0) {
          pointA = shape[index - 1];
        }
        if (index < shape.length - 1) {
          pointC = shape[index + 1];
        }
        const dcs = ["red", "orange", "yellow", "green", "violet", "black"]
        console.log(`${color}, ${pointB}, ${colorDistances}, ${dcs[index % dcs.length]}`)
        
        const op = Interval.findOffsetPoints(pointA, pointB, pointC, colorDistances);
        return op;
      })
      
      // If previous and next station are an equal distance from
      // the middle station, and at opposite angles, the vector
      // will be of magnitude 0, findOffsetPoints will return
      // null instead of a pair of coordinates for each distance.
      // This step replaces those null values with the average of
      // the offset points for the previous and next stations
      // which is the correct location in this case.
      colorOffsetPoints[color] = colorOffsetPoints[color].map((i, index) => {
        const oShape = colorOffsetPoints[color];
        if (i === null) {
          return [
            [
              (oShape[index - 1][0][0] + oShape[index + 1][0][0]) / 2,
              (oShape[index - 1][0][1] + oShape[index + 1][0][1]) / 2
            ],
            [
              (oShape[index - 1][1][0] + oShape[index + 1][1][0]) / 2,
              (oShape[index - 1][1][1] + oShape[index + 1][1][1]) / 2
            ]
          ]
        }
        return i;
      })
    })
    return colorOffsetPoints;
  }

  static findOffsetPoints(pointA, pointB, pointC, offsetLengthsMeters) {
    const pos = {};
    pos.a = pointA || null;
    pos.b = pointB || null;
    pos.c = pointC || null;
    console.log("Pos:", pos.a, pos.b, pos.c);
    // Distance between points A & B and points B & C in meters:
    let dLatAB, dLngAB, dLatCB, dLngCB;
    [dLatAB, dLngAB] = Interval.dLatLng(pointB, pointA);
    [dLatCB, dLngCB] = Interval.dLatLng(pointB, pointC);
    console.log("ds:", Math.floor(dLatAB * 100) / 100, Math.floor(dLngAB * 100) / 100, Math.floor(dLatCB * 100) / 100, Math.floor(dLngCB * 100) / 100);
    // Turn distances into vectors using Victor: http://victorjs.org/
    const abVector = new Victor(dLatAB, dLngAB);
    const cbVector = new Victor(dLatCB, dLngCB);
    console.log("AB:", abVector);
    console.log("CB:", cbVector)
    // Point B is last in interval shape:
    if (!pointC) {
      const offsetAVector = abVector.clone().normalize().rotate(Math.PI / 2);
      const pointBNOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, -offsetLengthsMeters[1]);
      const pointBSOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, -offsetLengthsMeters[0]);
      return [pointBNOffset, pointBSOffset];
  
      // Point B is first in interval shape:
    } else if (!pointA) {
      const offsetCVector = cbVector.clone().normalize().rotate(Math.PI / 2);

      // Swap N and S for first point:
      const pointBSOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, offsetLengthsMeters[0]);
      const pointBNOffset = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, offsetLengthsMeters[1]);
      return [pointBNOffset, pointBSOffset];
    }
  
    // Create equal magnitude vectors with the same directions:
    const abVectorEqLen = abVector.clone().multiply(new Victor(cbVector.length(), cbVector.length()));
    const cbVectorEqLen = cbVector.clone().multiply(new Victor(abVector.length(), abVector.length()));

    console.log("ABeq:", abVectorEqLen, abVectorEqLen.length())
    console.log("CBeq:", cbVectorEqLen, cbVectorEqLen.length())
  
    // Create new vector of magnitude 1 meter that bisects abVector and cbVector:
    const offsetBVector = abVectorEqLen.clone().add(cbVectorEqLen);
    // If station differences are of equal length and opposite
    // angles just skip the station.
    if (offsetBVector.length() === 0) {
      return null;
    }
    
    
    const offsetBVectorNormal = offsetBVector.clone().normalize();

    console.log("OBV:", offsetBVectorNormal, offsetBVector.length())


    // Create 2 points, each of the offsetLenghts away from Point B
    // where the angles bisect the lines to Points A and C:
    const oPos1 = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetBVectorNormal.x, offsetBVectorNormal.y, offsetLengthsMeters[0]);
    const oPos2 = Interval.offsetFromPoint(pos.b[0], pos.b[1], offsetBVectorNormal.x, offsetBVectorNormal.y, offsetLengthsMeters[1]);
  
    const crossProduct = abVector.cross(cbVector);
    console.log("CP:", crossProduct);
    return [oPos1, oPos2]
    // if (crossProduct < 0) {
    //   return [oPos1, oPos2];
    // } else {
    //   return [oPos2, oPos1];
    // }
  }

  // Convert meter vector back to Lat/Lng and find offset from set point (Point B):
  static offsetFromPoint(pointLat, pointLng, normalizedOffsetMetersX, normalizedOffsetMetersY, offsetLengthMeters = 1) {
    console.log("OLM:", offsetLengthMeters)
    const latOffset = METER_LAT_OFFSET * normalizedOffsetMetersX * offsetLengthMeters;
    const lngOffset = METER_LNG_OFFSET * normalizedOffsetMetersY * offsetLengthMeters;
    console.log("LatO:", latOffset, normalizedOffsetMetersX);
    console.log("LngO:", lngOffset, normalizedOffsetMetersY);
    const lat = pointLat + latOffset;
    const lng = pointLng + lngOffset;
    return [lat, lng];
  }

  // Extrat lat/lng and convert to meters:
  static dLatLng(s0, s1) {
    // s0 and s1 are [lat, lng]
    if (!s0 || !s1) {
      return [0, 0];
    }
    return [
      (s1[0] - s0[0]) / METER_LAT_OFFSET, 
      (s1[1] - s0[1]) / METER_LNG_OFFSET
    ];
  }
}

