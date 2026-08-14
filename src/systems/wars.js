const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("wars.json", {});

function getWars(guildId) {
  const db = store.load();
  return db[guildId] || { guildId, wars: [] };
}

function addWar(guildId, war) {
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, wars: [] };
    next = {
      guildId,
      wars: [
        {
          id: `${Date.now()}`,
          opponent: war.opponent,
          result: war.result || "pending",
          score: war.score || null,
          region: war.region || null,
          notes: war.notes || null,
          at: war.at || new Date().toISOString(),
        },
        ...current.wars,
      ].slice(0, 100),
    };
    db[guildId] = next;
    return db;
  });
  return next;
}

module.exports = { getWars, addWar };
