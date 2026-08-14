const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { brand } = require("./brand");
const stats = require("./systems/stats");
const snapshot = require("./systems/snapshot");
const profiles = require("./systems/profiles");
const leaderboard = require("./systems/leaderboard");
const lineup = require("./systems/lineup");
const ranking = require("./systems/ranking");
const score = require("./systems/score");
const blacklist = require("./systems/blacklist");
const trainers = require("./systems/trainers");
const challenges = require("./systems/challenges");
const wars = require("./systems/wars");
const coach = require("./systems/coach");
const guilds = require("./systems/guilds");

function botAuth(req, res, next) {
  const token = process.env.API_TOKEN;
  if (!token || token === "change-me-to-a-long-secret") return next();
  const got = req.get("x-bot-token") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (got !== token) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: brand.name });
  });

  app.get("/api/public/stats", (_req, res) => {
    res.json(stats.snapshot());
  });

  app.get("/api/public/brand", (_req, res) => {
    res.json({
      name: brand.name,
      tagline: brand.tagline,
      prefix: brand.prefix,
      website: brand.website,
      gif: brand.defaultGif,
    });
  });

  app.get("/api/public/:guildId", (req, res) => {
    res.json(snapshot.publicSnapshot(req.params.guildId));
  });

  app.get("/api/public", (_req, res) => {
    const guildId = process.env.PUBLIC_GUILD_ID || guilds.listGuilds()[0]?.guildId;
    if (!guildId) {
      return res.json({
        guildId: null,
        brand: { name: brand.name, tagline: brand.tagline, gif: brand.defaultGif },
        leaderboard: { setupCompleted: false, gif: brand.defaultGif, cards: [] },
        lineup: { setupCompleted: false, gif: brand.defaultGif, regions: [] },
        blacklist: [],
        trainers: [],
        wars: [],
        demo: true,
      });
    }
    res.json({ ...snapshot.publicSnapshot(guildId), demo: false });
  });

  const bot = express.Router();
  bot.use(botAuth);

  bot.get("/profiles/:guildId/:userId", (req, res) => {
    res.json(profiles.getProfile(req.params.guildId, req.params.userId) || null);
  });
  bot.post("/profiles/:guildId/:userId", (req, res) => {
    res.json(profiles.saveProfile(req.params.guildId, req.params.userId, req.body || {}));
  });
  bot.delete("/profiles/:guildId/:userId", (req, res) => {
    profiles.deleteProfile(req.params.guildId, req.params.userId);
    res.json({ ok: true });
  });
  bot.get("/profiles/lookup/:guildId", (req, res) => {
    res.json(profiles.findByRoblox(req.params.guildId, req.query.q) || null);
  });

  bot.get("/leaderboard/:guildId", (req, res) => res.json(leaderboard.getConfig(req.params.guildId)));
  bot.post("/leaderboard/:guildId", (req, res) => res.json(leaderboard.updateConfig(req.params.guildId, req.body || {})));
  bot.post("/leaderboard/:guildId/place", (req, res) => {
    res.json(leaderboard.place(req.params.guildId, Number(req.body.position), req.body.userId));
  });

  bot.get("/lineup/:guildId", (req, res) => res.json(lineup.getConfig(req.params.guildId)));
  bot.post("/lineup/:guildId", (req, res) => res.json(lineup.updateConfig(req.params.guildId, req.body || {})));
  bot.post("/lineup/:guildId/slot", (req, res) => {
    const { region, board, position, userId } = req.body || {};
    res.json(lineup.setSlot(req.params.guildId, region, board || "main", Number(position), userId));
  });

  bot.get("/ranking/:guildId", (req, res) => res.json(ranking.getConfig(req.params.guildId)));
  bot.post("/ranking/:guildId", (req, res) => res.json(ranking.updateConfig(req.params.guildId, req.body || {})));
  bot.post("/ranking/:guildId/stage", (req, res) => {
    res.json(ranking.setStage(req.params.guildId, req.body.userId, req.body.stage, req.body.moderatorId));
  });

  bot.post("/score/:guildId", (req, res) => res.json(score.recordMatch(req.params.guildId, req.body || {})));
  bot.get("/score/:guildId/:userId", (req, res) => res.json(score.getRecord(req.params.guildId, req.params.userId)));

  bot.get("/blacklist/:guildId", (req, res) => res.json(blacklist.getList(req.params.guildId)));
  bot.post("/blacklist/:guildId", (req, res) => res.json(blacklist.addEntry(req.params.guildId, req.body || {})));
  bot.delete("/blacklist/:guildId/:userId", (req, res) => {
    res.json(blacklist.removeEntry(req.params.guildId, req.params.userId));
  });

  bot.get("/trainers/:guildId", (req, res) => res.json(trainers.getList(req.params.guildId)));
  bot.post("/trainers/:guildId", (req, res) => res.json(trainers.upsert(req.params.guildId, req.body || {})));
  bot.delete("/trainers/:guildId/:userId", (req, res) => {
    res.json(trainers.remove(req.params.guildId, req.params.userId));
  });

  bot.post("/challenges/:guildId", (req, res) => {
    res.json(challenges.createChallenge(req.params.guildId, req.body.fromId, req.body.targetId));
  });

  bot.post("/wars/:guildId", (req, res) => res.json(wars.addWar(req.params.guildId, req.body || {})));

  bot.post("/coach/review", async (req, res) => {
    try {
      const result = await coach.reviewClip(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  bot.get("/snapshot/:guildId", (req, res) => res.json(snapshot.publicSnapshot(req.params.guildId)));
  bot.get("/player/:guildId/:userId", (req, res) => res.json(snapshot.playerBundle(req.params.guildId, req.params.userId)));
  bot.post("/guilds/:guildId", (req, res) => res.json(guilds.updateGuild(req.params.guildId, req.body || {})));

  app.use("/api/bot", bot);
  return app;
}

function startServer() {
  const app = createApp();
  const port = Number(process.env.API_PORT || 8787);
  const host = process.env.API_HOST || "0.0.0.0";
  return app.listen(port, host, () => {
    console.log(`${brand.name} API listening on http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
