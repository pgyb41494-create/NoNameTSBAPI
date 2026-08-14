const { createJsonStore } = require("../store/jsonStore");
const { brand } = require("../brand");

const store = createJsonStore("guilds.json", {});

function defaultGuild(guildId) {
  return {
    guildId,
    prefix: brand.prefix,
    setupCompleted: false,
    websiteSlug: null,
    createdAt: new Date().toISOString(),
  };
}

function getGuild(guildId) {
  const db = store.load();
  return db[guildId] || defaultGuild(guildId);
}

function updateGuild(guildId, patch) {
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || defaultGuild(guildId);
    next = { ...current, ...patch, guildId };
    db[guildId] = next;
    return db;
  });
  return next;
}

function listGuilds() {
  return Object.values(store.load());
}

module.exports = { getGuild, updateGuild, listGuilds, defaultGuild };
