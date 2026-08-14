const { readSession } = require("./auth");
const blacklist = require("./systems/blacklist");
const trainers = require("./systems/trainers");
const wars = require("./systems/wars");
const snapshot = require("./systems/snapshot");
const bridge = require("./botBridge");

function staffAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  req.staff = user;
  next();
}

function fail(res, err) {
  const status = err.status || 500;
  return res.status(status).json({ error: err.message || "Request failed" });
}

function mountStaff(app) {
  const r = require("express").Router();
  r.use(staffAuth);

  r.get("/guilds", (_req, res) => {
    try {
      res.json({ guilds: bridge.listGuilds() });
    } catch (err) {
      fail(res, err);
    }
  });

  r.post("/message", async (req, res) => {
    try {
      const { type, guildId, channelId, userId, content } = req.body || {};
      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: "Message text is required" });
      }
      if (type === "dm") {
        if (!userId) return res.status(400).json({ error: "userId is required" });
        const sent = await bridge.sendDirectMessage(userId, content);
        return res.json({ ok: true, sent });
      }
      if (!guildId || !channelId) {
        return res.status(400).json({ error: "guildId and channelId are required" });
      }
      const sent = await bridge.sendChannelMessage(guildId, channelId, content);
      return res.json({ ok: true, sent });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/overview", (req, res) => {
    res.json(snapshot.publicSnapshot(req.params.guildId));
  });

  r.get("/:guildId/channels", async (req, res) => {
    try {
      res.json({ channels: await bridge.listChannels(req.params.guildId) });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/members", async (req, res) => {
    try {
      res.json({ members: await bridge.searchMembers(req.params.guildId, req.query.q || "") });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/blacklist", (req, res) => res.json(blacklist.getList(req.params.guildId)));
  r.post("/:guildId/blacklist", (req, res) => {
    const { discordId, robloxUsername, reason } = req.body || {};
    if (!discordId) return res.status(400).json({ error: "discordId is required" });
    res.json(
      blacklist.addEntry(req.params.guildId, {
        discordId,
        robloxUsername,
        reason: reason || "No reason provided",
        addedBy: req.staff.id,
      })
    );
  });
  r.delete("/:guildId/blacklist/:userId", (req, res) => {
    res.json(blacklist.removeEntry(req.params.guildId, req.params.userId));
  });

  r.get("/:guildId/trainers", (req, res) => res.json(trainers.getList(req.params.guildId)));
  r.post("/:guildId/trainers", (req, res) => {
    const { discordId, specialty, role, bio } = req.body || {};
    if (!discordId) return res.status(400).json({ error: "discordId is required" });
    res.json(
      trainers.upsert(req.params.guildId, {
        discordId,
        specialty: specialty || "General",
        role: role || "Trainer",
        bio: bio || "",
        addedBy: req.staff.id,
      })
    );
  });
  r.delete("/:guildId/trainers/:userId", (req, res) => {
    res.json(trainers.remove(req.params.guildId, req.params.userId));
  });

  r.post("/:guildId/wars", (req, res) => {
    res.json(wars.addWar(req.params.guildId, req.body || {}));
  });

  app.use("/api/staff", r);
}

module.exports = { mountStaff, staffAuth };
