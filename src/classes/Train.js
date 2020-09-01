import findTrainPosition from "../helpers/findTrainPosition.js";

export default class Train {
  constructor(
    id,
    tripEntity
  ) {
    this.id = id;
    this.mostRecentTripEntity = tripEntity;

    this.direction = null;
    this.intermediateDestinations = [];
    this.nextStationId = null;
    this.latitude = null;
    this.longitude = null;
    this.marker = null;
    this.move = false;
    this.draw = false;
    this.remove = false;
    this.routeId = null;
    this.scheduledAt = null;
  }
  
  // Update a train's lat/long based on it's most recent
  // next stationand expected arrival time.
  locate() {

    try {

      if (!this.id || !this.mostRecentTripEntity) {
        throw "Incomplete train data."
      }

      let te = this.mostRecentTripEntity
        
      let nextStopUpdate = te.stopTimeUpdates[0];
      let arrivalEstimate = nextStopUpdate.arrival;
  
      // 🚸 Not sure if this will ever happen, but if this is an 
      // already mapped train set wait time to 0
      if (!arrivalEstimate) {
        arrivalEstimate = te.timestamp;
      }
  
      // If arrivalEstimate is negative, look at the second
      // stopTimeUpdate item
      if (arrivalEstimate < te.timestamp) {
        if (te.stopTimeUpdates.length > 1) {
          nextStopUpdate = te.stopTimeUpdates[1];
          arrivalEstimate = nextStopUpdate.arrival;
        } else {
          // 🚸 Unless there is only one, then default to 0
          arrivalEstimate = te.timestamp;
        }
      }
  
      // 🚸 These shouldn't change, but what if they do?
      this.routeId = te.trip.routeId;
      this.direction = te.trip.direction;
      const nextStopId = nextStopUpdate.GtfsStopId;
      const waitTimeEstimate = arrivalEstimate - te.timestamp;
  
      // All trains are either N or S (uptown/downtown)
      if (!(this.direction === 'N' || this.direction === 'S')) {
        throw 'Invalid train direction: ' + this.direction;
      }
  
      const trainPos = findTrainPosition(this.nextStationId, nextStopId, this.routeId, this.direction, waitTimeEstimate);

      // Update .nextStationId for next update to read.
      this.nextStationId = nextStopId;

      if (!trainPos.latitude || !trainPos.longitude) {
        throw "Error finding lat/long."
      }

      if (this.marker && this.latitude != trainPos.latitude || this.longitude != trainPos.longitude) {
        this.move = true;
      }

      this.latitude = trainPos.latitude;
      this.longitude = trainPos.longitude;
      this.intermediateDestinations = trainPos.intermediateDestinations

    } catch (error) {
      console.log("Error locating train:", error);
    }
  }

}