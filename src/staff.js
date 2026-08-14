const { readSession, isStaff } = require("./auth");
const blacklist = require("./systems/blacklist");
const trainers = require("./systems/trainers");
const wars = require("./systems/wars");
const reports = require("./systems/reports");
const snapshot = require("./systems/snapshot");
const bridge = require("./botBridge");
const guilds = require("./systems/guilds");

function loginAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  req.user = user;
  next();
}

function staffAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  if (!isStaff(user.id)) return res.status(403).json({ error: "Staff only" });
  req.staff = user;
  next();
}

function fail(res, err) {
  const status = err.status || 500;
  return res.status(status).json({ error: err.message || "Request failed" });
}

function defaultGuildId() {
  if (process.env.PUBLIC_GUILD_ID) return process.env.PUBLIC_GUILD_ID;
  const stored = guilds.listGuilds()[0]?.guildId;
  if (stored) return stored;
  try {
    return bridge.listGuilds()?.[0]?.id || null;
  } catch {
    return null;
  }
}

async function enrichUser(id) {
  try {
    return await bridge.fetchUser(id);
  } catch {
    return { id: String(id), username: String(id), displayName: String(id), avatar: null };
  }
}

function mountStaff(app) {
  const express = require("express");

  const userRouter = express.Router();
  userRouter.use(loginAuth);

  userRouter.post("/reports", async (req, res) => {
    try {
      const { reportedId, reason, proof, when, where } = req.body || {};
      if (!reportedId) return res.status(400).json({ error: "Reported Discord user ID is required" });
      if (!reason) return res.status(400).json({ error: "Reason is required" });
      if (!proof) return res.status(400).json({ error: "Proof is required" });
      let reported = null;
      try {
        reported = await bridge.fetchUser(reportedId);
      } catch {}
      const created = reports.create({
        reporterId: req.user.id,
        reporterName: req.user.username,
        reporterAvatar: req.user.avatar,
        reportedId,
        reportedName: reported?.displayName || reported?.username || null,
        reason,
        proof,
        when,
        where,
      });
      res.json({ ok: true, report: created });
    } catch (err) {
      fail(res, err);
    }
  });

  userRouter.get("/reports/mine", (req, res) => {
    const mine = reports.list().filter((r) => String(r.reporterId) === String(req.user.id));
    res.json({ reports: mine });
  });

  app.use("/api/user", userRouter);

  const r = express.Router();
  r.use(staffAuth);

  r.get("/guilds", (_req, res) => {
    try {
      res.json({ guilds: bridge.listGuilds() });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/reports", (_req, res) => {
    res.json({ reports: reports.list("pending") });
  });

  r.post("/reports/:id/approve", async (req, res) => {
    try {
      const report = reports.get(req.params.id);
      if (!report) return res.status(404).json({ error: "Report not found" });
      if (report.status !== "pending") return res.status(400).json({ error: "Report already reviewed" });

      const guildId = req.body.guildId || defaultGuildId();
      if (!guildId) return res.status(400).json({ error: "No guild configured. Set PUBLIC_GUILD_ID or invite the bot." });

      const player = await enrichUser(report.reportedId);
      const mod = await enrichUser(req.staff.id);

      const list = blacklist.addEntry(guildId, {
        discordId: report.reportedId,
        username: player.username,
        displayName: player.displayName,
        avatar: player.avatar,
        reason: report.reason,
        evidence: report.proof,
        where: report.where || "Clan League | Hub",
        when: report.when,
        reporterId: report.reporterId,
        reporterName: report.reporterName,
        addedBy: req.staff.id,
        moderatorName: mod.displayName || mod.username,
        moderatorAvatar: mod.avatar,
        at: new Date().toISOString(),
      });

      reports.update(report.id, {
        status: "approved",
        reviewedBy: req.staff.id,
        reviewedAt: new Date().toISOString(),
        guildId,
      });

      res.json({ ok: true, blacklist: list });
    } catch (err) {
      fail(res, err);
    }
  });

  r.post("/reports/:id/deny", (req, res) => {
    const report = reports.get(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    reports.update(report.id, {
      status: "denied",
      reviewedBy: req.staff.id,
      reviewedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
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
  r.post("/:guildId/blacklist", async (req, res) => {
    try {
      const { discordId, reason, evidence, where, when } = req.body || {};
      if (!discordId) return res.status(400).json({ error: "discordId is required" });
      const player = await enrichUser(discordId);
      const mod = await enrichUser(req.staff.id);
      res.json(
        blacklist.addEntry(req.params.guildId, {
          discordId,
          username: player.username,
          displayName: player.displayName,
          avatar: player.avatar,
          reason: reason || "No reason provided",
          evidence: evidence || null,
          where: where || "Clan League | Hub",
          when: when || null,
          addedBy: req.staff.id,
          moderatorName: mod.displayName || mod.username,
          moderatorAvatar: mod.avatar,
        })
      );
    } catch (err) {
      fail(res, err);
    }
  });
  r.delete("/:guildId/blacklist/:userId", (req, res) => {
    res.json(blacklist.removeEntry(req.params.guildId, req.params.userId));
  });

  r.get("/:guildId/trainers", (req, res) => res.json(trainers.getList(req.params.guildId)));
  r.post("/:guildId/trainers", async (req, res) => {
    try {
      const { discordId, stage, price, bio, role } = req.body || {};
      if (!discordId) return res.status(400).json({ error: "discordId is required" });
      const player = await enrichUser(discordId);
      res.json(
        trainers.upsert(req.params.guildId, {
          discordId,
          username: player.username,
          displayName: player.displayName,
          avatar: player.avatar,
          stage: stage || "Unranked",
          price: price || "TBD",
          specialty: stage || "General",
          role: role || "Trainer",
          bio: bio || "",
          addedBy: req.staff.id,
        })
      );
    } catch (err) {
      fail(res, err);
    }
  });
  r.delete("/:guildId/trainers/:userId", (req, res) => {
    res.json(trainers.remove(req.params.guildId, req.params.userId));
  });

  r.post("/:guildId/wars", (req, res) => {
    res.json(wars.addWar(req.params.guildId, req.body || {}));
  });

  app.use("/api/staff", r);
}

module.exports = { mountStaff, staffAuth, loginAuth };
