export default class Interval {
  constructor(nStation, sStation, colors, shape, followingStations={}) {
    this.nStation = nStation;
    this.sStation = sStation;
    this.followingStations = followingStations;
    this.colors = colors;
    this.shape = shape;
    this.offsets = {};
  }

  static combineIntervals(lineGroupIntervals, stations) {
    // Loop over each set of logged intervals separated by line color
    for (let color in lineGroupIntervals) {
      const colorIntervals = lineGroupIntervals[color];
      // Loop over each logged interval for the color
      colorIntervals.forEach(i => {
        const nStation = stations[i[0]];
        const sStation = stations[i[1]];
        const shape = i[4];
        const sStopIds = nStation.intervals.map(j => j.sStation.stopId);
        
        // Find stations after interval by
        // Filtering current colors intervals to ones where the
        // first station is our current station's second station
        const nextIntervals = i.filter(j => j[0] == sStation.stopId);
        // Find those station objects in stations
        const followingStations = nextIntervals.map(j => stations[j][1]);

        // If interval exists for another color add current color
        const matchIndex = sStopIds.indexOf(sStation.stopId);
        if (matchIndex > -1) {
          const currInter = nStation.intervals[matchIndex];
          currInter.colors.push(color);
          currInter.followingStations[color] = followingStations;
        } else {
          const followingStationsWithColor = {[color]: followingStations};
          // Otherwise make a new interval (this happens if there are currently 0)
          nStation.intervals.push(new Interval(nStation, sStation, [color], shape, followingStationsWithColor));
        }
      })
    }
  }
}

