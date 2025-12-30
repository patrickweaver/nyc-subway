import type { StationData } from "../types";

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
    this.stationId = s["Station ID"];
    this.complexId = s["Complex ID"];
    this.stopId = String(s["GTFS Stop ID"]);
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
      s: s["South Direction Label"],
    };
    //this.intervals = [];
  }
}
