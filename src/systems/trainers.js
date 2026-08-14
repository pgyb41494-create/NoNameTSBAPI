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
          role: trainer.role || "Trainer",
          specialty: trainer.specialty || "General",
          region: trainer.region || null,
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

module.exports = { getList, upsert, remove };
