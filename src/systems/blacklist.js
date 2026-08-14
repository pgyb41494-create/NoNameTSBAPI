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
          discordId: String(entry.discordId),
          robloxUsername: entry.robloxUsername || null,
          reason: entry.reason || "No reason provided",
          evidence: entry.evidence || null,
          addedBy: entry.addedBy || null,
          at: new Date().toISOString(),
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

module.exports = { getList, addEntry, removeEntry, isBlacklisted };
