const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("trainers.json", {});
const NETWORK_ID = "network";

function isNetwork(guildId) {
  const id = String(guildId || "").trim();
  return !id || id === NETWORK_ID;
}

function stripUser(db, discordId) {
  const id = String(discordId);
  for (const [guildId, bucket] of Object.entries(db)) {
    db[guildId] = {
      guildId,
      trainers: (bucket?.trainers || []).filter((t) => String(t.discordId) !== id),
    };
  }
}

function getList(guildId) {
  if (isNetwork(guildId)) return { guildId: NETWORK_ID, trainers: listAll() };
  const db = store.load();
  return db[guildId] || { guildId, trainers: [] };
}

function upsert(guildId, trainer) {
  const scope = isNetwork(guildId) ? NETWORK_ID : String(guildId);
  let next = null;
  store.updateSync((db) => {
    if (scope === NETWORK_ID) stripUser(db, trainer.discordId);
    const current = db[scope] || { guildId: scope, trainers: [] };
    const rest = current.trainers.filter((t) => String(t.discordId) !== String(trainer.discordId));
    next = {
      guildId: scope,
      trainers: [
        {
          discordId: String(trainer.discordId),
          username: trainer.username || null,
          displayName: trainer.displayName || null,
          avatar: trainer.avatar || null,
          stage: trainer.stage || "Unranked",
          price: trainer.price || "TBD",
          specialty: trainer.specialty || trainer.stage || "General",
          role: trainer.role || "Trainer",
          bio: trainer.bio || "",
          addedBy: trainer.addedBy || null,
          at: new Date().toISOString(),
        },
        ...rest,
      ],
    };
    db[scope] = next;
    return db;
  });
  return scope === NETWORK_ID ? { guildId: NETWORK_ID, trainers: listAll() } : next;
}

function remove(guildId, discordId) {
  if (isNetwork(guildId)) {
    store.updateSync((db) => {
      stripUser(db, discordId);
      return db;
    });
    return { guildId: NETWORK_ID, trainers: listAll() };
  }
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, trainers: [] };
    next = {
      guildId,
      trainers: current.trainers.filter((t) => String(t.discordId) !== String(discordId)),
    };
    db[guildId] = next;
    return db;
  });
  return next;
}

/** Public network directory — one row per Discord user. */
function listAll() {
  const db = store.load();
  const rows = [];
  for (const [guildId, bucket] of Object.entries(db)) {
    for (const trainer of bucket?.trainers || []) {
      rows.push({ ...trainer, guildId: trainer.guildId || guildId });
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

module.exports = { getList, upsert, remove, listAll };
