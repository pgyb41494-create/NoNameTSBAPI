require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
require("dotenv").config();

const { brand, authorName } = require("./brand");

module.exports = {
  brand,
  authorName,
  startServer: () => require("./server").startServer(),
  profiles: require("./systems/profiles"),
  guilds: require("./systems/guilds"),
  leaderboard: require("./systems/leaderboard"),
  lineup: require("./systems/lineup"),
  ranking: require("./systems/ranking"),
  score: require("./systems/score"),
  blacklist: require("./systems/blacklist"),
  trainers: require("./systems/trainers"),
  challenges: require("./systems/challenges"),
  wars: require("./systems/wars"),
  reports: require("./systems/reports"),
  snapshot: require("./systems/snapshot"),
  botBridge: require("./botBridge"),
  coach: require("./systems/coach"),
  cards: require("./lib/cards"),
  roblox: require("./lib/roblox"),
  regions: require("./lib/regions"),
  stages: require("./lib/stages"),
  characters: require("./lib/characters"),
  stats: require("./systems/stats"),
};
