/*
This is an example API response with data for 2 trains. The first train (index 0) is
currently on a trip, the second train (index 1) is not.

Trains are listed in the "entity" array.

A train currently on a trip will have a "tripUpdate" property.

A train NOT currently on a trip wil have a "vehicle" property.


*/

const apiResponse = {
  "header": { "gtfsRealtimeVersion": "1.0", "timestamp": "1597674316" },
  "entity": [
    {
      "id": "000001G",
      "tripUpdate": {
        "trip": {
          "tripId": "059500_G..N",
          "startTime": "09:55:00",
          "startDate": "20200817",
          "routeId": "G"
        },
        "stopTimeUpdate": [
          {
            "arrival": { "time": "1597674307" },
            "departure": { "time": "1597674307" },
            "stopId": "G26N"
          },
          {
            "arrival": { "time": "1597674401" },
            "departure": { "time": "1597674401" },
            "stopId": "G24N"
          },
          {
            "arrival": { "time": "1597674461" },
            "departure": { "time": "1597674461" },
            "stopId": "G22N"
          }
        ]
      }
    },
    {
      "id": "000002G",
      "vehicle": {
        "trip": {
          "tripId": "059500_G..N",
          "startTime": "09:55:00",
          "startDate": "20200817",
          "routeId": "G"
        },
        "currentStopSequence": 18,
        "timestamp": "1597674307",
        "stopId": "G26"
      }
    }
  ]
}
