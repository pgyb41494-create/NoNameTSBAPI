const fs = require("fs");
const path = require("path");

/**
 * Prefer Railway volume mounts:
 *   DATA_DIR=/data          (recommended)
 *   or mount at /app/data
 * Falls back to ./data locally.
 */
function resolveDataDir() {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  if (fs.existsSync("/data") && fs.statSync("/data").isDirectory()) return "/data";
  if (fs.existsSync("/app/data") && fs.statSync("/app/data").isDirectory()) return "/app/data";
  return path.join(process.cwd(), "data");
}

const DATA_DIR = resolveDataDir();

fs.mkdirSync(DATA_DIR, { recursive: true });

function dataFile(name) {
  return path.join(DATA_DIR, name);
}

module.exports = { DATA_DIR, dataFile, resolveDataDir };
