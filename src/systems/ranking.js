const { createJsonStore } = require("../store/jsonStore");
const { parseStage } = require("../lib/stages");

const store = createJsonStore("ranking.json", {});

function normalizeCommandName(value) {
  return String(value || "stage")
    .replace(/^[-/>!.]+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32) || "stage";
}

function defaultConfig(guildId) {
  return {
    guildId,
    setupCompleted: false,
    commandName: "stage",
    tierLabel: "Phase",
    tierCount: 5,
    applicantEnabled: true,
    leaderboardIntegration: true,
    regionRequired: false,
    phases: [],
    tiers: [],
    subtiers: ["High", "Mid", "Low"],
    subranks: ["High", "Mid", "Low"],
    powerRanks: ["Strong", "Stable", "Weak"],
    authorizedRoles: [],
    authorizedRoleIds: [],
    tierRoleIds: [],
    subrankRoleIds: [],
    powerRoleIds: [],
    applicantRoleId: null,
    colorMode: "fixed",
    fixedColors: [],
    tryoutCooldownDays: 0,
    tryoutCooldownRoleId: null,
    cooldownRoleId: null,
    autoCreateRoles: true,
    tierEmojis: [],
    useRoleEmojis: false,
    logChannelId: null,
    stages: {},
  };
}

function getConfig(guildId) {
  const db = store.load();
  const cfg = { ...defaultConfig(guildId), ...(db[guildId] || {}) };
  cfg.commandName = normalizeCommandName(cfg.commandName || "stage");
  if (!cfg.subranks?.length && cfg.subtiers?.length) cfg.subranks = cfg.subtiers;
  if (!cfg.authorizedRoles?.length && cfg.authorizedRoleIds?.length) {
    cfg.authorizedRoles = cfg.authorizedRoleIds;
  }
  if (!cfg.tryoutCooldownRoleId && cfg.cooldownRoleId) {
    cfg.tryoutCooldownRoleId = cfg.cooldownRoleId;
  }
  return cfg;
}

function updateConfig(guildId, patch) {
  let next = null;
  store.updateSync((db) => {
    const current = getConfig(guildId);
    next = {
      ...current,
      ...patch,
      guildId,
      commandName: normalizeCommandName(patch.commandName || current.commandName),
    };
    db[guildId] = next;
    return db;
  });
  return next;
}

function setConfig(guildId, config) {
  return updateConfig(guildId, { ...config, setupCompleted: true });
}

function resetConfig(guildId) {
  let next = null;
  store.updateSync((db) => {
    next = defaultConfig(guildId);
    db[guildId] = next;
    return db;
  });
  return next;
}

function isSetupCompleted(guildId) {
  return !!getConfig(guildId).setupCompleted;
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

function listAllStages() {
  const db = store.load();
  const rows = [];
  for (const [guildId, cfg] of Object.entries(db || {})) {
    for (const [userId, stage] of Object.entries(cfg.stages || {})) {
      rows.push({
        guildId: String(guildId),
        userId: String(userId),
        text: stage?.text || null,
        setBy: stage?.setBy || null,
        at: stage?.at || null,
      });
    }
  }
  return rows;
}

module.exports = {
  defaultConfig,
  getConfig,
  updateConfig,
  setConfig,
  resetConfig,
  isSetupCompleted,
  setStage,
  getStage,
  listAllStages,
  normalizeCommandName,
};
