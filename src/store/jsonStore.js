const fs = require("fs");
const path = require("path");
const { dataFile } = require("./dataPath");

function atomicWriteSync(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify(data, null, 2);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const bak = `${filePath}.bak`;

  fs.writeFileSync(tmp, payload, "utf8");
  try {
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, bak);
  } catch {}

  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fs.copyFileSync(tmp, filePath);
      fs.unlinkSync(tmp);
    } catch (fallbackErr) {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      throw fallbackErr || err;
    }
  }
}

function createJsonStore(filename, fallback = {}) {
  const filePath = dataFile(filename);
  let queue = Promise.resolve();

  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  function readSync() {
    if (!fs.existsSync(filePath)) {
      atomicWriteSync(filePath, fallback);
      return structuredClone(fallback);
    }
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      if (!raw.trim()) return structuredClone(fallback);
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : structuredClone(fallback);
    } catch (err) {
      const bak = `${filePath}.bak`;
      if (fs.existsSync(bak)) {
        try {
          const recovered = JSON.parse(fs.readFileSync(bak, "utf8"));
          atomicWriteSync(filePath, recovered);
          return recovered && typeof recovered === "object" ? recovered : structuredClone(fallback);
        } catch {}
      }
      console.error(`[store] Corrupt ${filename}, resetting:`, err.message);
      atomicWriteSync(filePath, fallback);
      return structuredClone(fallback);
    }
  }

  function writeSync(db) {
    atomicWriteSync(filePath, db && typeof db === "object" ? db : fallback);
  }

  return {
    filePath,
    load: () => readSync(),
    save: (db) => {
      writeSync(db);
      return db;
    },
    update(mutator) {
      return enqueue(() => {
        const db = readSync();
        const result = mutator(db);
        const next = result === undefined ? db : result;
        writeSync(next);
        return next;
      });
    },
    updateSync(mutator) {
      const db = readSync();
      const result = mutator(db);
      const next = result === undefined ? db : result;
      writeSync(next);
      return next;
    },
  };
}

module.exports = { createJsonStore, atomicWriteSync };
