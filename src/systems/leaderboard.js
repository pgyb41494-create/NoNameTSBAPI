const { createJsonStore } = require("../store/jsonStore");
const { brand } = require("../brand");

const store = createJsonStore("leaderboard.json", {});

function emptySlots(count) {
  return Array.from({ length: count }, (_, i) => ({ position: i + 1, discordId: null }));
}

function defaultConfig(guildId) {
  return {
    guildId,
    setupCompleted: false,
    managementChannelId: null,
    publicChannelIds: [],
    slotCount: 10,
    cardGifUrl: brand.defaultGif,
    theme: "classic",
    componentsV2: false,
    tipsMessageId: null,
    slots: emptySlots(10),
    messageIds: {},
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

function ensureSlots(guildId, count) {
  const cfg = getConfig(guildId);
  const n = Math.max(1, Math.min(50, count || cfg.slotCount || 10));
  const slots = [...(cfg.slots || [])];
  while (slots.length < n) slots.push({ position: slots.length + 1, discordId: null });
  const next = slots.slice(0, n).map((s, i) => ({ position: i + 1, discordId: s.discordId || null }));
  return updateConfig(guildId, { slots: next, slotCount: n });
}

function place(guildId, position, userId) {
  const cfg = ensureSlots(guildId, Math.max(getConfig(guildId).slotCount || 10, position));
  const slots = (cfg.slots || []).map((s) => ({
    position: s.position,
    discordId: String(s.discordId || "") === String(userId) ? null : s.discordId,
  }));
  slots[position - 1] = { position, discordId: userId };
  return updateConfig(guildId, { slots, setupCompleted: true });
}

function clearSlot(guildId, position) {
  const cfg = getConfig(guildId);
  const slots = [...(cfg.slots || [])];
  if (!slots[position - 1]) return cfg;
  slots[position - 1] = { position, discordId: null };
  return updateConfig(guildId, { slots });
}

module.exports = { getConfig, updateConfig, ensureSlots, place, clearSlot, defaultConfig, emptySlots };
