const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("score.json", {});

function defaultConfig(guildId) {
  return {
    guildId,
    setupCompleted: false,
    logChannelId: null,
    cooldownMs: 0,
    winnerCooldownDays: 4,
    loserCooldownDays: 7,
    autowinEnabled: true,
    autowinThreshold: 3,
    autowinSuccessBehavior: "reset",
    pvpUpdatesRoleId: null,
    allowedRoleIds: [],
    playerState: {},
    matches: [],
    records: {},
  };
}

function getConfig(guildId) {
  const db = store.load();
  return db[guildId] || defaultConfig(guildId);
}

function updateConfig(guildId, patch) {
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || defaultConfig(guildId);
    next = { ...current, ...patch, guildId };
    db[guildId] = next;
    return db;
  });
  return next;
}

function getRecord(guildId, userId) {
  const cfg = getConfig(guildId);
  return cfg.records?.[String(userId)] || { wins: 0, losses: 0, played: 0, recent: [] };
}

function recordMatch(guildId, payload) {
  const { winnerId, loserId, score, region, matchType, notes, refereeIds } = payload;
  const cfg = getConfig(guildId);
  const records = { ...(cfg.records || {}) };
  const bump = (id, result) => {
    const cur = records[String(id)] || { wins: 0, losses: 0, played: 0, recent: [] };
    cur.played += 1;
    if (result === "W") cur.wins += 1;
    else cur.losses += 1;
    cur.recent = [
      {
        result,
        score,
        opponent: result === "W" ? loserId : winnerId,
        region: region || null,
        at: new Date().toISOString(),
      },
      ...(cur.recent || []),
    ].slice(0, 8);
    records[String(id)] = cur;
  };
  bump(winnerId, "W");
  bump(loserId, "L");
  const match = {
    id: `${Date.now()}`,
    matchType: matchType || "1v1",
    winnerId,
    loserId,
    score,
    region: region || null,
    notes: notes || null,
    refereeIds: refereeIds || [],
    at: new Date().toISOString(),
  };
  const matches = [match, ...(cfg.matches || [])].slice(0, 200);
  updateConfig(guildId, { records, matches, setupCompleted: true });
  return match;
}

function getPlayerState(guildId, userId) {
  const cfg = getConfig(guildId);
  return cfg.playerState?.[String(userId)] || {
    lastMatchAt: null,
    lastResult: null,
    cooldownUntil: null,
    autowinStrikes: 0,
  };
}

function setPlayerState(guildId, userId, patch) {
  const cfg = getConfig(guildId);
  const id = String(userId);
  const playerState = { ...(cfg.playerState || {}) };
  playerState[id] = {
    lastMatchAt: null,
    lastResult: null,
    cooldownUntil: null,
    autowinStrikes: 0,
    ...(playerState[id] || {}),
    ...patch,
  };
  return updateConfig(guildId, { playerState });
}

function pushMatch(guildId, match) {
  const cfg = getConfig(guildId);
  const matches = [match, ...(cfg.matches || [])].slice(0, 100);
  return updateConfig(guildId, { matches });
}

function resetConfig(guildId) {
  return updateConfig(guildId, defaultConfig(guildId));
}

module.exports = {
  getConfig,
  updateConfig,
  getRecord,
  recordMatch,
  getPlayerState,
  setPlayerState,
  pushMatch,
  resetConfig,
  defaultConfig,
};
