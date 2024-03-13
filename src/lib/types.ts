import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export type ApiResponseError = {
	message: string;
};

export type ApiResponseBody = {
	message: string;
	success: boolean;
	error: ApiResponseError | null;
	data: unknown | null;
};

export const LineGroup = {
	ACE: 'ace',
	BDFM: 'bdfm',
	G: 'g',
	JZ: 'jz',
	NQRW: 'nqrw',
	L: 'l',
	ONE_TWO_THREE_FOUR_FIVE_SIX_GS: '123456',
	SEVEN: '7',
	SIR: 'si'
};

export type ParsedTripData = {
	tripId: string;
	trip: GtfsRealtimeBindings.transit_realtime.ITripDescriptor | null | undefined;
	stopTimeUpdates:
		| GtfsRealtimeBindings.transit_realtime.TripUpdate.IStopTimeUpdate[]
		| null
		| undefined;
	currentStopSequence?: number | null;
	vehicleTimestamp?: string | null;
	stopId?: string | null;
};

export type StationData = {
	'Station ID': number;
	'Complex ID': number;
	'GTFS Stop ID': string | number;
	Division: string;
	Line: string;
	'Stop Name': string;
	Borough: string;
	'Daytime Routes': string | number;
	Structure: string;
	'GTFS Latitude': number;
	'GTFS Longitude': number;
	'North Direction Label': string;
	'South Direction Label': string;
};

export type LineGroupInterval = [string, string, string, string, [string, string][]];

export type LineColor =
	| 'Blue'
	| 'Orange'
	| 'LightGreen'
	| 'Brown'
	| 'Yellow'
	| 'LightGrey'
	| 'Red'
	| 'Green'
	| 'DarkGrey'
	| 'Purple'
	| 'SteelBlue';

export type LineName =
	| 'A'
	| 'C'
	| 'E'
	| 'B'
	| 'D'
	| 'F'
	| 'M'
	| 'G'
	| 'J'
	| 'Z'
	| 'N'
	| 'Q'
	| 'R'
	| 'W'
	| 'L'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| 'GS'
	| '7'
	| 'SIR'
	| 'H'
	| '5X'
	| '6X'
	| 'FS';

export type LineGroupIntervals = {
	[key in LineColor]: LineGroupInterval[];
};

export type TrainDirection = 'N' | 'S';

export type LatLng = [number, number];
