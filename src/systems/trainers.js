const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("trainers.json", {});

function getList(guildId) {
  const db = store.load();
  return db[guildId] || { guildId, trainers: [] };
}

function upsert(guildId, trainer) {
  let next = null;
  store.updateSync((db) => {
    const current = db[guildId] || { guildId, trainers: [] };
    const rest = current.trainers.filter((t) => String(t.discordId) !== String(trainer.discordId));
    next = {
      guildId,
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
    db[guildId] = next;
    return db;
  });
  return next;
}

function remove(guildId, discordId) {
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

/** All trainers across every server (public network directory). */
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
