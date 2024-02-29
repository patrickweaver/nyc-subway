import StopTimeUpdate from "./StopTimeUpdate";
import Train from "./Train";
import Trip from "./Trip";
import lines from "../data/lines";
import type { EntityTripUpdate, LineName } from "../types";

export default class TripEntity {
  index: number;
  timestamp: number;
  trip: Trip | null;
  stopTimeUpdates: StopTimeUpdate[] | null;
  vehicleCurrentStopSequence: number | null;
  vehicleTimestamp: number | null;
  vehicleStopId: string | null;
  type: string;

  constructor(te: EntityTripUpdate, index: number) {
    let type = "Invalid"; // Default
    let tripObject = null;
    if (
      te.tripUpdate?.trip?.tripId &&
      //&& te.tripUpdate.trip.startTime // Not always present
      te.tripUpdate?.trip?.startDate &&
      te.tripUpdate?.trip?.routeId
    ) {
      if (
        te.vehicle &&
        te.tripUpdate.stopTimeUpdate?.[0]?.arrival?.time &&
        te.tripUpdate.stopTimeUpdate[0]?.departure?.time &&
        te.tripUpdate.stopTimeUpdate[0].stopId
      ) {
        if (
          te.vehicle.currentStopSequence &&
          //&& te.vehicle.timestamp // This is missing on some
          te.vehicle.stopId
        ) {
          type = "Current";
          tripObject = te.tripUpdate.trip;
        } else {
          type = "Scheduled";
          tripObject = te.vehicle.trip;
        }
      } else if (te.vehicle && te.vehicle.currentStopSequence) {
        // 🍄 Type assertion
        const line = lines[te.tripUpdate.trip.routeId as LineName];
        if (!line) throw "Invalid line: " + te.tripUpdate.trip.routeId;
        const currentStop = te.vehicle.currentStopSequence;
        const firstStop = parseInt(line[0], 10);
        const lastStop = parseInt(line[line.length - 1], 10);
        if (currentStop === firstStop || currentStop === lastStop) {
          type = "Arrived";
          tripObject = te.vehicle.trip;
        }
      } else {
        // 🚸 These seem to be future trips?
        //console.log("OTHER NO STU OR CSS at index:", index);
      }
    } else {
      console.log("OTHER NO TRIP at index:", index);
      console.log(
        "\nte.tripUpdate",
        te.tripUpdate,
        "\n.trip",
        te.tripUpdate.trip,
        "\n.trip.tripId",
        te.tripUpdate.trip.tripId,
        //,"\n.trip.startTime", te.tripUpdate.trip.startTime
        "\n.trip.startDate",
        te.tripUpdate.trip.startDate,
        "\n.trip.routeId",
        te.tripUpdate.trip.routeId
      );
    }

    this.index = index;
    this.timestamp = te.timestamp;

    let trip = null;
    if (type === "Current" || type === "Scheduled") {
      const startTime = tripObject?.startTime || null;
      trip = new Trip(
        tripObject?.tripId,
        startTime,
        tripObject?.startDate,
        tripObject?.routeId
      );
    }

    this.trip = trip;

    if (type === "Current") {
      const CURRENT_TRIPS_START_AT_MOST_IN_FUTURE = 30;
      if (
        !trip?.startTimestamp &&
        false // 🚸 Check if first stopTimeUpdate is first stop for direction and too far in future.
      ) {
        type = "noStartTime"; // Probably "Future" also
      } else if ((trip?.startTimestamp ?? 0) > te.timestamp) {
        type = "Future";
      }

      this.stopTimeUpdates = te.tripUpdate.stopTimeUpdate.map(
        (i, index) => new StopTimeUpdate(index, i)
      );
    } else {
      this.stopTimeUpdates = null;
    }

    if (type === "Scheduled") {
      this.vehicleCurrentStopSequence = te.vehicle?.currentStopSequence ?? null;
      this.vehicleTimestamp =
        parseInt(te.vehicle?.timestamp ?? "0", 10) || null;
      this.vehicleStopId = te.vehicle?.stopId ?? null;
    } else {
      this.vehicleCurrentStopSequence = null;
      this.vehicleTimestamp = null;
      this.vehicleStopId = null;
    }

    this.type = type;
  }

  // Creates a Train object from the data in a TrainEntity object
  createTrainOrFindTrainIn(trainsArray: Train[]) {
    try {
      const trip = this.trip;

      // Find or create Train object
      let trainObject = trainsArray.filter((i) => i.id === trip?.tripId)[0];
      if (!trainObject) {
        trainObject = new Train(trip?.tripId, this);
      } else {
        trainObject.mostRecentTripEntity = this;
      }

      return trainObject;
    } catch (error) {
      console.log(
        `Error parsing train at index ${this.index} update:\n`,
        error
      );

      return null;
    }
  }
}
