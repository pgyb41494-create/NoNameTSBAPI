const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("challenges.json", {});

function getState(guildId) {
  const db = store.load();
  return db[guildId] || { guildId, active: {} };
}

function busyIds(guildId) {
  const state = getState(guildId);
  const ids = new Set();
  for (const [fromId, value] of Object.entries(state.active || {})) {
    if (value.status && value.status !== "open") continue;
    ids.add(String(fromId));
    if (value.targetId) ids.add(String(value.targetId));
  }
  return [...ids];
}

function publicState(guildId) {
  const state = getState(guildId);
  return { ...state, busy: busyIds(guildId) };
}

function statusFor(guildId, userId) {
  const id = String(userId);
  return busyIds(guildId).includes(id) ? "challenged" : "open";
}

function createChallenge(guildId, fromId, targetId) {
  if (String(fromId) === String(targetId)) throw new Error("You cannot challenge yourself.");
  const busy = new Set(busyIds(guildId));
  if (busy.has(String(fromId))) throw new Error("You already have an open challenge.");
  if (busy.has(String(targetId))) throw new Error("That player is already being challenged.");
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
  return publicState(guildId);
}

function clearInvolving(guildId, userId) {
  const id = String(userId);
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, active: {} };
    for (const [fromId, value] of Object.entries(current.active || {})) {
      if (fromId === id || String(value.targetId) === id) delete current.active[fromId];
    }
    db[guildId] = current;
    return db;
  });
  return publicState(guildId);
}

module.exports = {
  getState,
  publicState,
  busyIds,
  statusFor,
  createChallenge,
  clearChallenge,
  clearInvolving,
};
