const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
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
const tryouts = require("./systems/tryouts");
const blacklist = require("./systems/blacklist");
const trainers = require("./systems/trainers");
const challenges = require("./systems/challenges");
const wars = require("./systems/wars");
const coach = require("./systems/coach");
const guilds = require("./systems/guilds");
const { mountAuth, websiteUrl } = require("./auth");
const { mountStaff } = require("./staff");
const panels = require("./systems/panels");

function botAuth(req, res, next) {
  const token = process.env.API_TOKEN;
  if (!token || token === "change-me-to-a-long-secret") return next();
  const got = req.get("x-bot-token") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (got !== token) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function createApp() {
  const app = express();
  const site = websiteUrl();
  app.use(
    cors({
      origin: [site, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "25mb" }));
  mountAuth(app);
  mountStaff(app);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: brand.name });
  });

  app.get("/api/public/stats", async (_req, res) => {
    try {
      res.json(await stats.snapshotAsync());
    } catch {
      res.json(stats.snapshot());
    }
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

  // Public user card so the website can load GIF PFPs from Discord CDN (proxying GIFs often 404s)
  app.get("/api/public/user/:userId", async (req, res) => {
    const { discordAvatarUrl, forceGifIfAnimated } = require("./lib/discordUser");
    const userId = String(req.params.userId || "").trim();
    try {
      const user = await require("./botBridge").fetchUser(userId);
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json({
        id: user?.id || userId,
        username: user?.username || null,
        avatar: forceGifIfAnimated(user?.avatar) || discordAvatarUrl(userId, user?.avatarHash, 256),
        avatarHash: user?.avatarHash || null,
        animated: !!(user?.avatarHash && String(user.avatarHash).startsWith("a_")),
      });
    } catch {
      res.setHeader("Cache-Control", "no-store");
      res.json({
        id: userId,
        username: null,
        avatar: discordAvatarUrl(userId, null, 256),
        avatarHash: null,
        animated: false,
      });
    }
  });

  // Proxies Discord avatars. Prefer CDN URLs from /api/public/user — GIFs often fail when fetched server-side.
  app.get("/api/public/avatar/:userId", async (req, res) => {
    const { discordAvatarUrl, forceGifIfAnimated, avatarCandidateUrls } = require("./lib/discordUser");
    const userId = String(req.params.userId || "").trim();
    try {
      const user = await require("./botBridge").fetchUser(userId);
      const urls = avatarCandidateUrls(userId, user);
      const fromUser = forceGifIfAnimated(user?.avatar);
      if (fromUser) urls.unshift(fromUser);
      const unique = [...new Set(urls.filter(Boolean))];
      for (const url of unique) {
        const img = await fetch(url, { redirect: "follow" }).catch(() => null);
        if (!img?.ok) continue;
        const type = img.headers.get("content-type") || "image/gif";
        const buf = Buffer.from(await img.arrayBuffer());
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", "public, max-age=120");
        return res.send(buf);
      }
      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, discordAvatarUrl(userId, null, 256));
    } catch {
      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, discordAvatarUrl(userId, null, 256));
    }
  });

  app.get("/api/public/:guildId", async (req, res) => {
    try {
      const { enrichNetworkPublic } = require("./lib/enrichPublic");
      const base = snapshot.publicSnapshot(req.params.guildId);
      res.json(await enrichNetworkPublic(base));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load public board" });
    }
  });

  // Network-wide public boards (inviteable multi-server bot — no PUBLIC_GUILD_ID)
  app.get("/api/public", async (_req, res) => {
    try {
      const { enrichNetworkPublic } = require("./lib/enrichPublic");
      res.json(await enrichNetworkPublic(snapshot.networkPublic()));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load public board" });
    }
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
  bot.get("/score-config/:guildId", (req, res) => res.json(score.getConfig(req.params.guildId)));
  bot.post("/score-config/:guildId", (req, res) => res.json(score.updateConfig(req.params.guildId, req.body || {})));

  bot.get("/tryouts/:guildId", (req, res) => res.json(tryouts.getSettings(req.params.guildId)));
  bot.post("/tryouts/:guildId", (req, res) => res.json(tryouts.patchSettings(req.params.guildId, req.body || {})));
  bot.post("/tryouts/:guildId/session", (req, res) => res.json(tryouts.saveSession(req.params.guildId, req.body || {})));

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

  bot.get("/challenges/:guildId", (req, res) => res.json(challenges.publicState(req.params.guildId)));
  bot.post("/challenges/:guildId", (req, res) => {
    try {
      res.json(challenges.createChallenge(req.params.guildId, req.body.fromId, req.body.targetId));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  bot.post("/challenges/:guildId/clear", (req, res) => {
    res.json(challenges.clearInvolving(req.params.guildId, req.body.userId || req.body.fromId));
  });
  bot.get("/challenges/:guildId/dodges/:userId", (req, res) => {
    res.json(challenges.getDodge(req.params.guildId, req.params.userId));
  });
  bot.post("/challenges/:guildId/dodge", (req, res) => {
    try {
      res.json(challenges.useDodge(req.params.guildId, req.body.userId));
    } catch (err) {
      res.status(400).json({ error: err.message, code: err.code });
    }
  });
  bot.post("/challenges/:guildId/accept", (req, res) => {
    res.json(challenges.acceptChallenge(req.params.guildId, req.body.fromId));
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

  bot.post("/coach/ask", async (req, res) => {
    try {
      const result = await coach.askTsbl(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  bot.get("/snapshot/:guildId", (req, res) => res.json(snapshot.publicSnapshot(req.params.guildId)));
  bot.get("/player/:guildId/:userId", (req, res) => res.json(snapshot.playerBundle(req.params.guildId, req.params.userId)));
  bot.post("/guilds/:guildId", (req, res) => res.json(guilds.updateGuild(req.params.guildId, req.body || {})));

  bot.get("/panels/:guildId", (req, res) => res.json(panels.map(req.params.guildId)));
  bot.get("/panels/:guildId/:panelKey", (req, res) => {
    const panel = panels.get(req.params.guildId, req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel not found" });
    res.json(panel);
  });

  app.use("/api/bot", bot);
  return app;
}

function startServer() {
  const app = createApp();
  // Railway / Obscura style: prefer PORT, fall back to API_PORT for local
  const port = Number(process.env.PORT || process.env.API_PORT || 8787);
  const host = process.env.API_HOST || "0.0.0.0";
  return app.listen(port, host, () => {
    console.log(`${brand.name} API listening on http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
