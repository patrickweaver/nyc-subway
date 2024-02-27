import { DateTime } from "luxon";
const timezone = "America/New_York";

// This is a wrapper for the luxon DateTime module
// that always sets the timezone to the value set in
// .env.

export default class LocalTime {
  // Construtor takes a DateTime object and
  // probably should be used, instead use the
  // static methods.
  constructor(datetime) {
    this.datetime = datetime.setZone(timezone);
  }

  static fromTimestamp(timestamp) {
    // The api gives second precision timestamps
    // This is invalid for train data before 1975
    // and will break in the year 6723.

    let fullTS = timestamp;
    if (fullTS < 150000000000) {
      fullTS *= 1000;
    }

    const datetime = DateTime.fromMillis(fullTS).setZone(timezone);
    return new LocalTime(datetime);
  }

  static fromYYMMDD_HHMMSS(YYMMDD, HHMMSS) {
    const datetime = DateTime.fromObject(
      {
        year: YYMMDD.substring(0, 4),
        month: YYMMDD.substring(4, 6),
        day: YYMMDD.substring(6, 8),
        hour: HHMMSS.substring(0, 2),
        minute: HHMMSS.substring(3, 5),
        second: HHMMSS.substring(6, 8),
      },
      { zone: timezone },
    );
    return new LocalTime(datetime);
  }

  static fromCurrentTime() {
    //console.log("TZ:", timezone);
    return new LocalTime(DateTime.fromObject({}, { zone: timezone }));
  }

  secondPrecisionTS() {
    return Math.round(this.datetime.ts / 1000);
  }

  printTime() {
    return this.datetime.toLocaleString(DateTime.TIME_WITH_SECONDS);
  }
}
