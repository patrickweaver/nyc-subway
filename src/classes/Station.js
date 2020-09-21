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

}

/* Ideas:

- 




*/