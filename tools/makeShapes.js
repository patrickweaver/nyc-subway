import fs from "fs";
import shapes from "./shapes.js";

// {"shape_id":"1..N03R","shape_pt_lat":"40.702068","shape_pt_lon":"-74.013664","shape_pt_sequence":"0","shape_dist_traveled":""},
// {"shape_id":"1..N03R","shape_pt_lat":"40.703199","shape_pt_lon":"-74.014792","shape_pt_sequence":"1","shape_dist_traveled":""},

try {
  const lineShapes = {};

  shapes.forEach((shape, index) => {
    let line;
    if (shape.shape_id.indexOf("..") < 0) {
      if (shape.shape_id.indexOf(".") >= 0) {
        line = shape.shape_id.split(".")[0];
      }
    } else {
      line = shape.shape_id.split("..")[0];
    }
    if (!line) {
      throw "Invalid Shape at index " + index + "\n" + JSON.stringify(shape);
    }

    if (lineShapes[line] === undefined) {
      lineShapes[line] = {};
    }

    if (lineShapes[line][shape.shape_id] === undefined) {
      lineShapes[line][shape.shape_id] = [];
    }

    if (
      !shape.shape_pt_lat ||
      !shape.shape_pt_lon ||
      shape.shape_pt_sequence === undefined
    ) {
      throw "Invalid Shape at index " + index + "\n" + JSON.stringify(shape);
    }

    const shapeUpdated = {
      lat: shape.shape_pt_lat,
      lng: shape.shape_pt_lon,
      seq: shape.shape_pt_sequence,
    };

    lineShapes[line][shape.shape_id].push(shapeUpdated);
  });

  for (let line in lineShapes) {
    for (let shapesId in lineShapes[line]) {
      const shapeArray = lineShapes[line][shapesId];
      shapeArray.sort((a, b) => a.seq - b.seq);
      lineShapes[line][shapesId] = shapeArray.map((sa) => [sa.lat, sa.lng]);
    }
  }

  const shapesCopy = `// Parsed data from shapes.txt file from GTFS download

  export default `;

  const filename = "./tools/shapesUpdated.js";
  fs.writeFile(
    filename,
    shapesCopy + JSON.stringify(lineShapes),
    function (err) {
      if (err) return console.log("Error:\n", err);
      console.log(`Shapes file updated.`);
    },
  );
} catch (error) {
  console.log("Error writing file\n", error);
}
