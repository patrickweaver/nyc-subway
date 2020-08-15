export default class Train {
  constructor(
    id,
    latitude,
    longitude,
    direction
  ) {
    this.id = id;
    this.latitude = latitude;
    this.longitude = longitude;
    this.direction = direction;
    this.marker = null;
  }

}