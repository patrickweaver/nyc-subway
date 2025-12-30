import { DateTime } from "luxon";
import { TIME_ZONE } from "../config";
const timezone = TIME_ZONE;

// This is a wrapper for the luxon DateTime module that always sets the
// timezone to the value set in config.ts.

export default class LocalTime {
  datetime: DateTime<true> | DateTime<false>;
  // Construtor takes a DateTime object and probably should be used, instead
  // use the static methods.
  constructor(datetime: DateTime<true> | DateTime<false>) {
    this.datetime = datetime.setZone(timezone);
  }

  static fromTimestamp(timestamp: number) {
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

  static fromYYMMDD_HHMMSS(YYMMDD: string, HHMMSS: string) {
    const datetime = DateTime.fromObject(
      {
        year: parseInt(YYMMDD.substring(0, 4), 10),
        month: parseInt(YYMMDD.substring(4, 6), 10),
        day: parseInt(YYMMDD.substring(6, 8), 10),
        hour: parseInt(HHMMSS.substring(0, 2), 10),
        minute: parseInt(HHMMSS.substring(3, 5), 10),
        second: parseInt(HHMMSS.substring(6, 8), 10),
      },
      { zone: timezone }
    );
    return new LocalTime(datetime);
  }

  static fromCurrentTime() {
    //console.log("TZ:", timezone);
    const dt = DateTime.fromObject({}, { zone: timezone });
    return new LocalTime(dt);
  }

  // 🍄 Type issue
  secondPrecisionTS() {
    return Math.round(this.datetime.ts / 1000);
  }

  printTime() {
    return this.datetime.toLocaleString(DateTime.TIME_WITH_SECONDS);
  }
}
