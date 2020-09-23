import Victor from 'victor';

export default class Station {
  constructor(stationDataObject) {
    const s = stationDataObject;
    this.stationId = s["Station ID"];
    this.complexId = s["Complex ID"];
    this.stopId = s["GTFS Stop ID"];
    this.division = s["Division"];
    this.lineName = s["Line"];
    this.name = s["Stop Name"];
    this.borough = s["Borough"];
    this.routes = s["Daytime Routes"].toString().split(" ");
    this.structureType = s["Structure"];
    this.latitude = s["GTFS Latitude"];
    this.longitude = s["GTFS Longitude"];
    this.directionLabel = {
      n: s["North Direction Label"],
      s: s["South Direction Label"]
    }
    this.intervals = [];
  }

  /*
    station: {
      intervals: [
        {
          nStation
          sStation
          colors: []
          followingStaitons: {
            [color]: [station, station]
          }
        }
      ]
    }


  */

  calculateOffsets() {
    let currentOffsetLevel = 20;
    // 1. 

  }

  static findOffsetPoints(stationA, stationB, stationC, offsetLengthMeters) {
  
    const pos = {};
    pos.a = stationA ? [stationA.latitude, stationA.longitude] : null;
    pos.b = stationB ? [stationB.latitude, stationB.longitude] : null;
    pos.c = stationC ? [stationC.latitude, stationC.longitude] : null;
  
    // Distance between stations A & B and stations B & C in meters:
    let dLatAB, dLngAB, dLatCB, dLngCB;
    [dLatAB, dLngAB] = this.dLatLng(stationB, stationA);
    [dLatCB, dLngCB] = this.dLatLng(stationB, stationC);
  
    // Turn station distances into vectors using Victor: http://victorjs.org/
    const abVector = new Victor(dLatAB, dLngAB);
    const cbVector = new Victor(dLatCB, dLngCB);
  
    // B is last station on line:
    if (!stationC) {
      const offsetAVector = abVector.clone().normalize().rotate(Math.PI / 2);
      stationB.nOffset = this.offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, offsetLengthMeters);
      stationB.sOffset = this.offsetFromPoint(pos.b[0], pos.b[1], offsetAVector.x, offsetAVector.y, -offsetLengthMeters);
      return [stationB.nOffset, stationB.sOffset];
  
      // B is first station on line
    } else if (!stationA) {
      const offsetCVector = cbVector.clone().normalize().rotate(Math.PI / 2);
      // Swap N and S for first station:
      stationB.sOffset = this.offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, offsetLengthMeters);
      stationB.nOffset = this.offsetFromPoint(pos.b[0], pos.b[1], offsetCVector.x, offsetCVector.y, -offsetLengthMeters);
      return [stationB.nOffset, stationB.sOffset];
    }
  
    // Create equal magnitude vectors with the same directions:
    const abVectorEqLen = abVector.clone().multiply(new Victor(cbVector.length(), cbVector.length()));
    const cbVectorEqLen = cbVector.clone().multiply(new Victor(abVector.length(), abVector.length()));
  
    // Create new vector of magnitude 1 meter that bisects abVector and cbVector:
    const offsetBVector = abVectorEqLen.clone().add(cbVectorEqLen).normalize();
    
    // Create 2 points on opposite sides of Station B 50 meters away
    // where the angles bisect the lines to Station A and C:
    const oPos = this.offsetFromPoint(pos.b[0], pos.b[1], offsetBVector.x, offsetBVector.y, offsetLengthMeters);
    const oPosNeg = this.offsetFromPoint(pos.b[0], pos.b[1], offsetBVector.x, offsetBVector.y, -offsetLengthMeters);
  
    const crossProduct = abVector.cross(cbVector);
  
    if (crossProduct < 0) {
      return [oPosNeg, oPos];
    } else {
      return [oPos, oPosNeg];
    }
    
  }

  // Convert meter vector back to Lat/Lng and find offset from set point (Station B):
  static offsetFromPoint(pointLat, pointLng, normalizedOffsetMetersX, normalizedOffsetMetersY, offsetLengthMeters = 1) {
    return [
      pointLat + (METER_LAT_OFFSET * normalizedOffsetMetersX * offsetLengthMeters),
      pointLng + (METER_LNG_OFFSET * normalizedOffsetMetersY * offsetLengthMeters)
    ];
  }

  // Extrat lat/lng and convert to meters:
  static dLatLng(s0, s1) {
    if (!s0 || !s1) {
      return [0, 0];
    }
    return [
      (s1.latitude - s0.latitude) / METER_LAT_OFFSET, 
      (s1.longitude - s0.longitude) / METER_LNG_OFFSET
    ];
  }

}
