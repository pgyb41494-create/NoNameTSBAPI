const profiles = require("./profiles");
const guilds = require("./guilds");
const leaderboard = require("./leaderboard");
const score = require("./score");
const wars = require("./wars");
const blacklist = require("./blacklist");
const trainers = require("./trainers");

function trackedPlayers() {
  const ids = new Set();
  for (const p of profiles.allProfiles()) {
    if (p?.discord_id) ids.add(String(p.discord_id));
  }
  for (const row of blacklist.listAll()) {
    if (row?.discordId) ids.add(String(row.discordId));
  }
  for (const row of trainers.listAll()) {
    if (row?.discordId) ids.add(String(row.discordId));
  }
  return ids.size;
}

function snapshot() {
  const guildList = guilds.listGuilds();
  let matchCount = 0;
  let warCount = 0;
  for (const g of guildList) {
    matchCount += (score.getConfig(g.guildId).matches || []).length;
    warCount += (wars.getWars(g.guildId).wars || []).length;
  }
  return {
    players: trackedPlayers(),
    servers: guildList.length,
    wars: warCount,
    matches: matchCount,
    boards: guildList.filter((g) => leaderboard.getConfig(g.guildId).setupCompleted).length,
  };
}

/** Live Discord guild count + member totals from the bot service. */
async function snapshotAsync() {
  const base = snapshot();
  try {
    const bridge = require("../botBridge");
    const live = await bridge.listGuildsAsync();
    const list = Array.isArray(live) ? live : [];
    const servers = list.length;
    const members = list.reduce((n, g) => n + (Number(g.memberCount) || 0), 0);
    return {
      ...base,
      servers: servers || base.servers,
      // Prefer live member total; fall back to tracked users in our data
      players: members > 0 ? members : base.players,
      memberTotal: members,
      trackedPlayers: base.players,
    };
  } catch {
    return base;
  }
}

module.exports = { snapshot, snapshotAsync, trackedPlayers };
