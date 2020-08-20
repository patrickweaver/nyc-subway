const fs = require("fs");

const tripsCsvFilePath = "./.data/logs/trips.csv";
const csv = require('csvtojson');

const lines = [
  "A", "B", "C", "D", "E", "F", "G", //"H"
  "J", "L", "M", "N", "Q", "R", //"S"
  "W", //"Z"
  "1", "2", "3", "4", "5", "6", "7"
]

main();

async function main() {

  console.log(lines)

  const jsonTrips = await csv().fromFile(tripsCsvFilePath);

  const updates


}