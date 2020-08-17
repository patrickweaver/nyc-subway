export default class Train {
  constructor(
    id,
    latitude,
    longitude,
    direction,
    scheduledAt=false
  ) {
    this.id = id;
    this.latitude = latitude;
    this.longitude = longitude;
    this.direction = direction;
    this.scheduledAt = scheduledAt;
    this.marker = null;
  }

  static newScheduledTrain(scheduledAt) {
    return new Train(null, null, null, null, scheduledAt);
  }

}