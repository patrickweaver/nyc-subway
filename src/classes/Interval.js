export default class Interval {
  constructor(nStation, sStation, colors) {
    this.nStation = nStation;
    this.sStation = sStation;
    this.colors = colors;
  }

  static combineIntervals(lineGroupIntervals, stations) {
    // Loop over each set of logged intervals separated by line color
    for (let color in lineGroupIntervals) {
      const colorIntervals = lineGroupIntervals[color];
      // Loop over each logged interval for the color
      colorIntervals.forEach(i => {
        const nStation = stations[i[0]];
        const sStation = stations[i[1]];
        const sStopIds = nStation.intervals.map(j => j.sStation.stopId);
        // If interval exists for another color add current color
        const matchIndex = sStopIds.indexOf(sStation.stopId);
        if (matchIndex > -1) {
          nStation.intervals[matchIndex].colors.push(color);
        } else {
        // Otherwise make a new interval (this happens if there are currently 0)
          nStation.intervals.push(new Interval(nStation, sStation, [color]));
        }
      })
    }
  }

}

