export default class Interval {
  constructor(nStation, sStation, colors) {
    this.nStation = nStation;
    this.sStation = sStation;
    this.colors = colors;
  }

  static combineIntervals(lineGroupIntervals, stations) {
    for (let color in lineGroupIntervals) {
      const colorIntervals = lineGroupIntervals[color];
      colorIntervals.forEach(i => {
        const nStation = stations[i[0]];
        const sStation = stations[i[1]];
        const currentIntervals = nStation.intervals;
        if (currentIntervals.length > 0) {
          // Combine intervals
        } else  {
          // Insert new interval
        }
      })
    }
  }


}

