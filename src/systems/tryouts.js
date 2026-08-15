const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("tryouts.json", {});

function defaultSettings(guildId) {
  return {
    guildId,
    channelId: "",
    pingRoleId: "",
    defaultRequiredSignups: 0,
    defaultMaxSignups: 0,
    configured: false,
    sessions: {},
  };
}

function getSettings(guildId) {
  const db = store.load();
  const current = { ...defaultSettings(guildId), ...(db[guildId] || {}) };
  current.configured = Boolean(current.channelId);
  return current;
}

function patchSettings(guildId, patch) {
  let next = null;
  store.updateSync((db) => {
    const current = getSettings(guildId);
    next = {
      ...current,
      ...patch,
      guildId,
      configured: Boolean(patch.channelId ?? current.channelId),
    };
    db[guildId] = next;
    return db;
  });
  return next;
}

function saveSession(guildId, session) {
  const cfg = getSettings(guildId);
  const sessions = { ...(cfg.sessions || {}) };
  sessions[session.token] = session;
  return patchSettings(guildId, { sessions });
}

function deleteSession(guildId, token) {
  const cfg = getSettings(guildId);
  const sessions = { ...(cfg.sessions || {}) };
  delete sessions[token];
  return patchSettings(guildId, { sessions });
}

function listSessions(guildId) {
  return Object.values(getSettings(guildId).sessions || {});
}

module.exports = {
  defaultSettings,
  getSettings,
  patchSettings,
  saveSession,
  deleteSession,
  listSessions,
};
