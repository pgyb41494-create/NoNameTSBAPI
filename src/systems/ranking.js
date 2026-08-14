const { createJsonStore } = require("../store/jsonStore");
const { parseStage } = require("../lib/stages");

const store = createJsonStore("ranking.json", {});

function defaultConfig(guildId) {
  return {
    guildId,
    setupCompleted: false,
    tierLabel: "Stage",
    logChannelId: null,
    cooldownRoleId: null,
    authorizedRoleIds: [],
    stages: {},
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

function setStage(guildId, userId, stageInput, moderatorId = null) {
  const stage = parseStage(stageInput);
  if (!stage) throw new Error("Invalid stage.");
  const cfg = getConfig(guildId);
  const stages = { ...(cfg.stages || {}) };
  stages[String(userId)] = {
    text: stage,
    setBy: moderatorId,
    at: new Date().toISOString(),
  };
  return updateConfig(guildId, { stages, setupCompleted: true });
}

function getStage(guildId, userId) {
  const cfg = getConfig(guildId);
  return cfg.stages?.[String(userId)]?.text || null;
}

module.exports = { getConfig, updateConfig, setStage, getStage, defaultConfig };
