const profiles = require("./profiles");
const guilds = require("./guilds");
const leaderboard = require("./leaderboard");
const score = require("./score");
const wars = require("./wars");

function snapshot() {
  const allProfiles = profiles.allProfiles();
  const guildList = guilds.listGuilds();
  const uniquePlayers = new Set(allProfiles.map((p) => p.discord_id)).size;
  let matchCount = 0;
  let warCount = 0;
  for (const g of guildList) {
    matchCount += (score.getConfig(g.guildId).matches || []).length;
    warCount += (wars.getWars(g.guildId).wars || []).length;
  }
  return {
    players: uniquePlayers,
    servers: guildList.length,
    wars: warCount,
    matches: matchCount,
    boards: guildList.filter((g) => leaderboard.getConfig(g.guildId).setupCompleted).length,
  };
}

module.exports = { snapshot };
