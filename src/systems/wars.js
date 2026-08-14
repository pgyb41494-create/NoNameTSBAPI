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

/** All wars across every server (public network feed). */
function listAll() {
  const db = store.load();
  const rows = [];
  for (const [guildId, bucket] of Object.entries(db)) {
    for (const war of bucket?.wars || []) {
      rows.push({ ...war, guildId: war.guildId || guildId });
    }
  }
  rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  return rows;
}

module.exports = { getWars, addWar, listAll };
