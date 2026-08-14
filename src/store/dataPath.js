const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "..", "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

function dataFile(name) {
  return path.join(DATA_DIR, name);
}

module.exports = { DATA_DIR, dataFile };
