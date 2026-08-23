const { createJsonStore } = require("../store/jsonStore");
const { brand } = require("../brand");
const { LINEUP_REGIONS } = require("../lib/regions");

const store = createJsonStore("lineup.json", {});

function emptySlots(count) {
  return Array.from({ length: count }, (_, i) => ({ position: i + 1, discordId: null }));
}

function defaultRegion(key, label) {
  return {
    key,
    label,
    channelId: null,
    subChannelId: null,
    messageId: null,
    subMessageId: null,
    slots: emptySlots(10),
    subSlots: emptySlots(10),
  };
}

function defaultConfig(guildId) {
  const regions = {};
  for (const r of LINEUP_REGIONS) regions[r.key] = defaultRegion(r.key, r.label);
  return {
    guildId,
    setupCompleted: false,
    managementChannelId: null,
    tipsMessageId: null,
    cardGifUrl: brand.defaultGif,
    slotsPerRegion: 10,
    subSlotsPerRegion: 10,
    separateSubChannels: false,
    allowedRoles: [],
    enabledRegionKeys: ["na", "east", "west", "central", "eu", "asia"],
    regions,
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
    const safePatch = { ...(patch || {}) };
    if (
      safePatch.regions &&
      typeof safePatch.regions === "object" &&
      !Object.keys(safePatch.regions).length &&
      current.regions &&
      Object.keys(current.regions).length
    ) {
      delete safePatch.regions;
    }
    next = { ...current, ...safePatch, guildId };
    db[guildId] = next;
    return db;
  });
  return next;
}

function getRegion(guildId, key) {
  const cfg = getConfig(guildId);
  return cfg.regions?.[key] || null;
}

function setSlot(guildId, regionKey, board, position, userId) {
  const cfg = getConfig(guildId);
  const region = cfg.regions?.[regionKey];
  if (!region) throw new Error("Unknown lineup region.");
  const field = board === "sub" ? "subSlots" : "slots";
  const slots = [...(region[field] || emptySlots(10))];
  for (const slot of slots) {
    if (String(slot.discordId || "") === String(userId)) slot.discordId = null;
  }
  if (!slots[position - 1]) throw new Error("Invalid slot.");
  slots[position - 1] = { position, discordId: userId };
  const regions = { ...cfg.regions, [regionKey]: { ...region, [field]: slots } };
  return updateConfig(guildId, { regions, setupCompleted: true });
}

function clearSlot(guildId, regionKey, board, position) {
  return setSlot(guildId, regionKey, board, position, null);
}

module.exports = {
  getConfig,
  updateConfig,
  getRegion,
  setSlot,
  clearSlot,
  defaultConfig,
  LINEUP_REGIONS,
};
