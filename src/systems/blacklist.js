const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("blacklist.json", {});

function getList(guildId) {
  const db = store.load();
  return db[guildId] || { guildId, entries: [] };
}

function addEntry(guildId, entry) {
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, entries: [] };
    const filtered = current.entries.filter((e) => String(e.discordId) !== String(entry.discordId));
    next = {
      guildId,
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
          moderatorAvatar: entry.moderatorAvatar || null,
          at: entry.at || new Date().toISOString(),
        },
        ...filtered,
      ],
    };
    db[guildId] = next;
    return db;
  });
  return next;
}

function removeEntry(guildId, discordId) {
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, entries: [] };
    next = {
      guildId,
      entries: current.entries.filter((e) => String(e.discordId) !== String(discordId)),
    };
    db[guildId] = next;
    return db;
  });
  return next;
}

function isBlacklisted(guildId, discordId) {
  return getList(guildId).entries.some((e) => String(e.discordId) === String(discordId));
}

/** All entries across every server (public network blacklist). */
function listAll() {
  const db = store.load();
  const rows = [];
  for (const [guildId, bucket] of Object.entries(db)) {
    for (const entry of bucket?.entries || []) {
      rows.push({ ...entry, guildId: entry.guildId || guildId });
    }
  }
  rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  // Prefer newest row per Discord user for the public network view
  const seen = new Set();
  return rows.filter((row) => {
    const id = String(row.discordId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

module.exports = { getList, addEntry, removeEntry, isBlacklisted, listAll };
