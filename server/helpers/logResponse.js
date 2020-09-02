const fs = require("fs");

module.exports = function (apiResponse, line) {
  const filename = `./.data/logs/api_response_${line}_${(new Date()).getTime()}.json`;
  fs.writeFile(filename, JSON.stringify(apiResponse), function (err) {
    if (err) return console.log("Error:\n", err);
    console.log(`${line} line data written to ${filename}`);
  });
};