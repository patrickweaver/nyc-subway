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

export type LineGroupInterval = [
  string,
  string,
  string,
  string,
  [string, string][]
];

export type LineColor =
  | "Blue"
  | "Orange"
  | "LightGreen"
  | "Brown"
  | "Yellow"
  | "LightGrey"
  | "Red"
  | "Green"
  | "DarkGrey"
  | "Purple"
  | "SteelBlue";

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
  | "SIR";

export type LineGroupIntervals = {
  [key in LineColor]: LineGroupInterval[];
};

export type TrainDirection = "N" | "S";
