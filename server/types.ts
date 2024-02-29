export type StationData = {
  "Station ID": number;
  "Complex ID": number;
  "GTFS Stop ID": string | number;
  Division: string;
  Line: string;
  "Stop Name": string;
  Borough: string;
  "Daytime Routes": string | number;
  Structure: string;
  "GTFS Latitude": number;
  "GTFS Longitude": number;
  "North Direction Label": string;
  "South Direction Label": string;
};

export type LineName =
  | "A"
  | "C"
  | "E"
  | "B"
  | "D"
  | "F"
  | "M"
  | "G"
  | "J"
  | "Z"
  | "N"
  | "Q"
  | "R"
  | "W"
  | "L"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "GS"
  | "7"
  | "SIR"
  | "H"
  | "5X"
  | "6X"
  | "FS";

export type TrainDirection = "N" | "S";

export type StopTimeUpdateData = {
  stopSequence: number;
  stopId: string;
  arrival: {
    time: string;
    delay: number;
    uncertainty: number;
  };
  departure: {
    time: string;
    delay: number;
    uncertainty: number;
  };
  scheduleRelationship: string;
};

export type TripData = {
  directionId: number;
  tripId: string;
  scheduleRelationship: string;
  routeId: string;
  startDate: string;
  startTime: string;
};

export type TripUpdateData = {
  trip: TripData;
  stopTimeUpdate: StopTimeUpdateData[];
  timestamp: string;
};

export type EntityTripUpdate = FeedEntityTripUpdateData & {
  vehicle: VehicleData | null;
  alert: AlertData | null;
  timestamp: number;
};

export type PositionData = {
  latitude: number;
  longitude: number;
  bearing: number;
  odometer: number;
  speed: number;
};

export type VehicleData = {
  currentStatus: string;
  currentStopSequence: number;
  stopId: string;
  timestamp: string;
  trip: TripData;
};

export type FeedEntityTripUpdateData = {
  id: string;
  tripUpdate: TripUpdateData;
};

export type FeedEntityVehicleData = {
  id: string;
  vehicle: VehicleData;
};

export type AlertData = {
  informedEntity?: string;
  headerText?: {
    translation: string;
  };
};

export type Alert = AlertData & {
  texts: string[];
};

export type FeedEntityAlertData = {
  id: string;
  alert: AlertData;
};

export type FeedEntityData =
  | FeedEntityTripUpdateData
  | FeedEntityVehicleData
  | FeedEntityAlertData;

export type FeedEntityDataWithTimestamp = FeedEntityData & {
  timestamp: number;
};

export type FeedData = {
  header: {
    gtfsRealtimeVersion: string;
    incrementality: string;
    timestamp: string;
  };
  entity: FeedEntityData[];
};
