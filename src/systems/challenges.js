const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("challenges.json", {});
const MAX_DODGES = 2;

function emptyState(guildId) {
  return { guildId, active: {}, dodges: {} };
}

function getState(guildId) {
  const db = store.load();
  const current = db[guildId] || {};
  return {
    ...emptyState(guildId),
    ...current,
    active: current.active || {},
    dodges: current.dodges || {},
  };
}

function writeState(guildId, patchFn) {
  let next = null;
  store.updateSync((db) => {
    const current = getState(guildId);
    next = patchFn({ ...current, active: { ...current.active }, dodges: { ...current.dodges } });
    db[guildId] = next;
    return db;
  });
  return next;
}

function busyIds(guildId) {
  const state = getState(guildId);
  const ids = new Set();
  for (const [fromId, value] of Object.entries(state.active || {})) {
    if (value.status && value.status !== "open" && value.status !== "accepted") continue;
    ids.add(String(fromId));
    if (value.targetId) ids.add(String(value.targetId));
  }
  return [...ids];
}

function publicState(guildId) {
  const state = getState(guildId);
  return { guildId: state.guildId, active: state.active, busy: busyIds(guildId), dodges: state.dodges };
}

function statusFor(guildId, userId) {
  const id = String(userId);
  return busyIds(guildId).includes(id) ? "challenged" : "open";
}

function getDodge(guildId, userId) {
  const used = Math.max(0, Math.min(MAX_DODGES, Number(getState(guildId).dodges[String(userId)] || 0)));
  return { used, remaining: Math.max(0, MAX_DODGES - used), max: MAX_DODGES };
}

function useDodge(guildId, userId) {
  const current = getDodge(guildId, userId);
  if (current.remaining <= 0) {
    const err = new Error("You have no dodges left. You must accept.");
    err.code = "no_dodges";
    throw err;
  }
  writeState(guildId, (state) => {
    state.dodges[String(userId)] = current.used + 1;
    return state;
  });
  return getDodge(guildId, userId);
}

function createChallenge(guildId, fromId, targetId) {
  if (String(fromId) === String(targetId)) throw new Error("You cannot challenge yourself.");
  const busy = new Set(busyIds(guildId));
  if (busy.has(String(fromId))) throw new Error("You already have an open challenge.");
  if (busy.has(String(targetId))) throw new Error("That player is already being challenged.");
  let created = null;
  writeState(guildId, (state) => {
    state.active[String(fromId)] = {
      targetId: String(targetId),
      status: "open",
      at: new Date().toISOString(),
    };
    created = state.active[String(fromId)];
    return state;
  });
  return created;
}

function acceptChallenge(guildId, fromId) {
  writeState(guildId, (state) => {
    const row = state.active[String(fromId)];
    if (row) row.status = "accepted";
    return state;
  });
  return publicState(guildId);
}

function clearChallenge(guildId, fromId) {
  writeState(guildId, (state) => {
    delete state.active[String(fromId)];
    return state;
  });
  return publicState(guildId);
}

function clearInvolving(guildId, userId) {
  const id = String(userId);
  writeState(guildId, (state) => {
    for (const [fromId, value] of Object.entries(state.active || {})) {
      if (fromId === id || String(value.targetId) === id) delete state.active[fromId];
    }
    return state;
  });
  return publicState(guildId);
}

module.exports = {
  MAX_DODGES,
  getState,
  publicState,
  busyIds,
  statusFor,
  getDodge,
  useDodge,
  createChallenge,
  acceptChallenge,
  clearChallenge,
  clearInvolving,
};
