const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("challenges.json", {});

function getState(guildId) {
  const db = store.load();
  return db[guildId] || { guildId, active: {} };
}

function statusFor(guildId, userId) {
  const state = getState(guildId);
  const id = String(userId);
  for (const [key, value] of Object.entries(state.active || {})) {
    if (value.status !== "open") continue;
    if (key === id || value.targetId === id) return "challenged";
  }
  return "open";
}

function createChallenge(guildId, fromId, targetId) {
  if (String(fromId) === String(targetId)) throw new Error("You cannot challenge yourself.");
  let created = null;
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, active: {} };
    current.active[String(fromId)] = {
      targetId: String(targetId),
      status: "open",
      at: new Date().toISOString(),
    };
    created = current.active[String(fromId)];
    db[guildId] = current;
    return db;
  });
  return created;
}

function clearChallenge(guildId, fromId) {
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, active: {} };
    delete current.active[String(fromId)];
    db[guildId] = current;
    return db;
  });
}

module.exports = { getState, statusFor, createChallenge, clearChallenge };
