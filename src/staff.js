const { readSession, isStaff, isOwner } = require("./auth");
const blacklist = require("./systems/blacklist");
const trainers = require("./systems/trainers");
const wars = require("./systems/wars");
const reports = require("./systems/reports");
const snapshot = require("./systems/snapshot");
const bridge = require("./botBridge");
const guilds = require("./systems/guilds");
const { listDashboardGuilds, canConfigureGuild } = require("./lib/dashboardGuilds");
const panels = require("./systems/panels");
const activity = require("./systems/activity");
const profiles = require("./systems/profiles");
const ranking = require("./systems/ranking");

function loginAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  req.user = user;
  next();
}

function requireStaff(req, res, next) {
  if (!isStaff(req.user?.id)) return res.status(403).json({ error: "Staff only" });
  req.staff = req.user;
  next();
}

function requireOwner(req, res, next) {
  if (!isOwner(req.user?.id)) {
    return res.status(403).json({ error: "Only the two bot owners can change the network blacklist." });
  }
  req.staff = req.user;
  next();
}

function fail(res, err) {
  const status = err.status || 500;
  return res.status(status).json({ error: err.message || "Request failed" });
}

async function syncPanelsToBot(guildId) {
  try {
    await bridge.replacePanels(guildId, panels.dump(guildId));
  } catch {
    // Bot HTTP may be briefly down; /panel will still pull from the API.
  }
}

/** Prefer the guild the staff picked in the dashboard; fall back to network scope. */
function resolveStaffGuildId(bodyGuildId) {
  const picked = String(bodyGuildId || "").trim();
  if (picked) return picked;
  return "network";
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
  r.use(loginAuth);

  r.get("/guilds", async (req, res) => {
    try {
      res.json({ guilds: await listDashboardGuilds(req.user) });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/reports", requireStaff, (_req, res) => {
    res.json({ reports: reports.list("pending") });
  });

  r.post("/reports/:id/approve", requireOwner, async (req, res) => {
    try {
      const report = reports.get(req.params.id);
      if (!report) return res.status(404).json({ error: "Report not found" });
      if (report.status !== "pending") return res.status(400).json({ error: "Report already reviewed" });

      const guildId = "network";

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
        moderatorUsername: mod.username,
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

  r.post("/reports/:id/deny", requireStaff, (req, res) => {
    const report = reports.get(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    reports.update(report.id, {
      status: "denied",
      reviewedBy: req.staff.id,
      reviewedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  });

  r.post("/message", requireStaff, async (req, res) => {
    try {
      const { type, guildId, channelId, userId, content, embed, format } = req.body || {};
      const useEmbed = format === "embed" || (embed && typeof embed === "object");
      const payload = useEmbed ? { content, embed } : { content };

      if (type === "dm") {
        if (!userId) return res.status(400).json({ error: "userId is required" });
        const sent = await bridge.sendDirectMessage(userId, payload);
        return res.json({ ok: true, sent });
      }
      if (!guildId || !channelId) {
        return res.status(400).json({ error: "guildId and channelId are required" });
      }
      const sent = await bridge.sendChannelMessage(guildId, channelId, payload);
      return res.json({ ok: true, sent });
    } catch (err) {
      fail(res, err);
    }
  });

  async function guildNameMap() {
    try {
      let list = await bridge.listGuildsAsync();
      if (!Array.isArray(list)) list = list?.guilds || [];
      return Object.fromEntries(list.map((g) => [String(g.id), g.name]));
    } catch {
      return {};
    }
  }

  r.get("/activity", requireStaff, async (req, res) => {
    try {
      const names = await guildNameMap();
      const live = activity.list({
        event: req.query.event || null,
        guildId: req.query.guildId || null,
        limit: 500,
      });
      const historical = [];
      for (const profile of profiles.allProfiles()) {
        if (!profile.roblox_username && !profile.verified_at) continue;
        historical.push({
          id: `hist-profile-${profile.guild_id || "global"}-${profile.discord_id}`,
          at: profile.verified_at || profile.created_at || profile.updated_at,
          guildId: String(profile.guild_id || "global"),
          event: "profile",
          title: "Profile registered",
          summary: `${profile.discord_id} linked ${profile.roblox_username || "a Roblox account"}`,
          payload: {
            discordId: profile.discord_id,
            roblox_username: profile.roblox_username,
            region: profile.region,
            country: profile.country,
          },
        });
      }
      for (const row of ranking.listAllStages()) {
        historical.push({
          id: `hist-phase-${row.guildId}-${row.userId}`,
          at: row.at,
          guildId: row.guildId,
          event: "phase",
          title: "Rank updated",
          summary: `${row.userId} → ${row.text || "?"}${row.setBy ? ` by ${row.setBy}` : ""}`,
          payload: { targetId: row.userId, stage: row.text, actorId: row.setBy },
        });
      }
      const merged = activity.mergeWithHistorical(live, historical)
        .filter((row) => !req.query.event || row.event === req.query.event)
        .filter((row) => !req.query.guildId || req.query.guildId === "network" || String(row.guildId) === String(req.query.guildId))
        .slice(0, 300)
        .map((row) => ({
          ...row,
          guildName: names[String(row.guildId)] || row.guildId,
        }));
      res.json({ events: merged });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/duplicates", requireStaff, async (req, res) => {
    try {
      const names = await guildNameMap();
      const groups = profiles.listNetworkDuplicateGroups().map((group) => ({
        ...group,
        accounts: group.accounts.map((account) => ({
          ...account,
          guildNames: (account.guilds || []).map((id) => names[String(id)] || id),
        })),
      }));
      res.json({ groups });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/roster", requireStaff, async (req, res) => {
    try {
      const names = await guildNameMap();
      const players = profiles
        .allProfiles()
        .filter((p) => p.roblox_id || p.verified_at || p.roblox_username)
        .map((p) => ({
          discordId: p.discord_id,
          displayName: p.display_name,
          robloxUsername: p.roblox_username,
          robloxId: p.roblox_id,
          profileId: p.profile_id,
          guildId: p.guild_id,
          guildName: names[String(p.guild_id)] || p.guild_id || "—",
          region: p.region,
          country: p.country,
          rank: p.guild_id ? ranking.getStage(p.guild_id, p.discord_id) : null,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          verifiedAt: p.verified_at,
        }))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      res.json({ players });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/roles", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json({ roles: await bridge.listRoles(req.params.guildId) });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/verify", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.getVerifyConfig(req.params.guildId));
    } catch (err) {
      fail(res, err);
    }
  });

  r.put("/:guildId/verify", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.setVerifyConfig(req.params.guildId, req.body || {}));
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/overview", requireStaff, (req, res) => {
    res.json(snapshot.publicSnapshot(req.params.guildId));
  });

  r.get("/:guildId/channels", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json({ channels: await bridge.listChannels(req.params.guildId) });
    } catch (err) {
      fail(res, err);
    }
  });

  r.post("/:guildId/channels", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      const created = await bridge.createChannel(req.params.guildId, req.body || {});
      res.json(created);
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/audit", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.getAuditConfig(req.params.guildId));
    } catch (err) {
      fail(res, err);
    }
  });

  r.put("/:guildId/audit", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.setAuditConfig(req.params.guildId, req.body || {}));
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/invites", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.getInvitesConfig(req.params.guildId));
    } catch (err) {
      fail(res, err);
    }
  });

  r.put("/:guildId/invites", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.setInvitesConfig(req.params.guildId, req.body || {}));
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/alerts", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.getStaffAlertsConfig(req.params.guildId));
    } catch (err) {
      fail(res, err);
    }
  });

  r.put("/:guildId/alerts", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json(await bridge.setStaffAlertsConfig(req.params.guildId, req.body || {}));
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/panels", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      res.json({ panels: panels.list(req.params.guildId) });
      syncPanelsToBot(req.params.guildId).catch(() => {});
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/panels/:panelKey", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      const panel = panels.get(req.params.guildId, req.params.panelKey);
      if (!panel) return res.status(404).json({ error: "Panel not found" });
      res.json({ panel });
    } catch (err) {
      fail(res, err);
    }
  });

  r.post("/:guildId/panels", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      const created = panels.create(req.params.guildId, req.body || {});
      await syncPanelsToBot(req.params.guildId);
      res.json({ panel: created });
    } catch (err) {
      fail(res, err);
    }
  });

  r.put("/:guildId/panels/:panelKey", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      const updated = panels.update(req.params.guildId, req.params.panelKey, req.body || {});
      await syncPanelsToBot(req.params.guildId);
      res.json({ panel: updated });
    } catch (err) {
      fail(res, err);
    }
  });

  r.delete("/:guildId/panels/:panelKey", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      const removed = panels.remove(req.params.guildId, req.params.panelKey);
      await syncPanelsToBot(req.params.guildId);
      res.json(removed);
    } catch (err) {
      fail(res, err);
    }
  });

  r.post("/:guildId/panels/:panelKey/send", async (req, res) => {
    try {
      if (!(await canConfigureGuild(req.user, req.params.guildId))) {
        return res.status(403).json({ error: "You cannot configure that server." });
      }
      const channelId = String(req.body?.channelId || req.body?.channel || "").trim();
      if (!channelId) return res.status(400).json({ error: "channelId is required" });
      const panel = panels.get(req.params.guildId, req.params.panelKey);
      if (!panel) return res.status(404).json({ error: "Panel not found" });
      const payload = panels.buildDiscordPayload(req.params.guildId, panel, panel.key);
      const sent = await bridge.sendChannelMessage(req.params.guildId, channelId, payload);
      res.json({ ok: true, sent });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/members", requireStaff, async (req, res) => {
    try {
      res.json({ members: await bridge.searchMembers(req.params.guildId, req.query.q || "") });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/:guildId/blacklist", requireStaff, (req, res) => res.json(blacklist.getList("network")));
  r.post("/:guildId/blacklist", requireOwner, async (req, res) => {
    try {
      const { discordId, reason, evidence, where, when } = req.body || {};
      if (!discordId) return res.status(400).json({ error: "discordId is required" });
      const player = await enrichUser(discordId);
      const mod = await enrichUser(req.staff.id);
      res.json(
        blacklist.addEntry("network", {
          discordId,
          username: player.username,
          displayName: player.displayName,
          avatar: player.avatar,
          reason: reason || "No reason provided",
          evidence: evidence || null,
          where: where || "Clan League | Hub",
          when: when || null,
          addedBy: req.staff.id,
          moderatorUsername: mod.username,
          moderatorName: mod.displayName || mod.username,
          moderatorAvatar: mod.avatar,
        })
      );
    } catch (err) {
      fail(res, err);
    }
  });
  r.delete("/:guildId/blacklist/:userId", requireOwner, (req, res) => {
    res.json(blacklist.removeEntry("network", req.params.userId));
  });

  r.get("/:guildId/trainers", requireStaff, (req, res) => res.json(trainers.getList(req.params.guildId)));
  r.post("/:guildId/trainers", requireStaff, async (req, res) => {
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
  r.delete("/:guildId/trainers/:userId", requireStaff, (req, res) => {
    res.json(trainers.remove(req.params.guildId, req.params.userId));
  });

  r.post("/:guildId/wars", requireStaff, (req, res) => {
    res.json(wars.addWar(req.params.guildId, req.body || {}));
  });

  app.use("/api/staff", r);
}

module.exports = { mountStaff, loginAuth, requireStaff };
