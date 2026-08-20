const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("blacklist.json", {});
const NETWORK_ID = "network";

function stripUser(db, discordId) {
  const id = String(discordId);
  for (const [guildId, bucket] of Object.entries(db)) {
    db[guildId] = {
      guildId,
      entries: (bucket?.entries || []).filter((e) => String(e.discordId) !== id),
    };
  }
}

function getList(_guildId) {
  return { guildId: NETWORK_ID, entries: listAll() };
}

function addEntry(_guildId, entry) {
  store.updateSync((db) => {
    stripUser(db, entry.discordId);
    const current = db[NETWORK_ID] || { guildId: NETWORK_ID, entries: [] };
    db[NETWORK_ID] = {
      guildId: NETWORK_ID,
      entries: [
        {
          id: entry.id || `${Date.now()}`,
          discordId: String(entry.discordId),
          username: entry.username || null,
          displayName: entry.displayName || null,
          avatar: entry.avatar || null,
          robloxUsername: entry.robloxUsername || null,
          reason: entry.reason || "No reason provided",
          evidence: entry.evidence || null,
          where: entry.where || "Clan League | Hub",
          when: entry.when || null,
          reporterId: entry.reporterId || null,
          reporterName: entry.reporterName || null,
          addedBy: entry.addedBy || null,
          moderatorName: entry.moderatorName || null,
          moderatorUsername: entry.moderatorUsername || null,
          moderatorAvatar: entry.moderatorAvatar || null,
          at: entry.at || new Date().toISOString(),
        },
        ...current.entries,
      ],
    };
    return db;
  });
  return getList();
}

function removeEntry(_guildId, discordId) {
  store.updateSync((db) => {
    stripUser(db, discordId);
    return db;
  });
  return getList();
}

function isBlacklisted(_guildId, discordId) {
  return listAll().some((e) => String(e.discordId) === String(discordId));
}

function listAll() {
  const db = store.load();
  const rows = [];
  for (const [guildId, bucket] of Object.entries(db)) {
    for (const entry of bucket?.entries || []) {
      rows.push({ ...entry, guildId: entry.guildId || guildId });
    }
  }
  rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const seen = new Set();
  return rows.filter((row) => {
    const id = String(row.discordId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

module.exports = { getList, addEntry, removeEntry, isBlacklisted, listAll };
