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
const score = require("./systems/score");

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

  async function networkData() {
    const apiProfiles = profiles.allProfiles();
    const apiStages = ranking.listAllStages();
    const apiMatches = typeof score.listAllMatches === "function" ? score.listAllMatches() : [];
    let bot = { profiles: [], stages: [], matches: [] };
    try {
      bot = await bridge.getNetworkSnapshot();
    } catch {
      bot = { profiles: [], stages: [], matches: [] };
    }
    const profileMap = new Map();
    for (const p of [...apiProfiles, ...(bot.profiles || [])]) {
      const key = `${p.guild_id || p.guildId || "global"}:${p.discord_id || p.discordId}`;
      if (!profileMap.has(key)) profileMap.set(key, p);
    }
    const stageMap = new Map();
    for (const row of [...apiStages, ...(bot.stages || [])]) {
      const key = `${row.guildId}:${row.userId}`;
      const prev = stageMap.get(key);
      if (!prev || String(row.at || "") > String(prev.at || "")) stageMap.set(key, row);
    }
    const matchMap = new Map();
    for (const match of [...apiMatches, ...(bot.matches || [])]) {
      const key = `${match.guildId}:${match.id || `${match.winnerId}-${match.at}`}`;
      if (!matchMap.has(key)) matchMap.set(key, match);
    }
    return {
      profiles: [...profileMap.values()],
      stages: [...stageMap.values()],
      matches: [...matchMap.values()],
    };
  }

  r.get("/activity", requireStaff, async (req, res) => {
    try {
      const names = await guildNameMap();
      const live = activity.list({ limit: 500 });
      const data = await networkData();
      const historical = activity.historicalFromData(data);
      const merged = activity
        .mergeWithHistorical(live, historical)
        .filter((row) => !req.query.event || row.event === req.query.event)
        .filter(
          (row) =>
            !req.query.guildId ||
            req.query.guildId === "network" ||
            String(row.guildId) === String(req.query.guildId)
        )
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
      const data = await networkData();
      const byRoblox = new Map();
      for (const profile of data.profiles) {
        const robloxId = profile.roblox_id || profile.robloxId;
        if (!robloxId) continue;
        const key = String(robloxId);
        if (!byRoblox.has(key)) byRoblox.set(key, new Map());
        const byDiscord = byRoblox.get(key);
        const discordId = String(profile.discord_id || profile.discordId);
        if (!byDiscord.has(discordId)) byDiscord.set(discordId, []);
        byDiscord.get(discordId).push(profile);
      }
      const groups = [];
      for (const [robloxId, byDiscord] of byRoblox) {
        if (byDiscord.size < 2) continue;
        const accounts = [...byDiscord.entries()].map(([discordId, rows]) => ({
          discordId,
          displayName: rows[0].display_name || rows[0].displayName,
          robloxUsername: rows[0].roblox_username || rows[0].robloxUsername,
          robloxId,
          profileId: rows[0].profile_id || rows[0].profileId,
          guilds: [...new Set(rows.map((row) => row.guild_id || row.guildId).filter(Boolean))],
        }));
        groups.push({
          robloxId,
          robloxUsername: accounts[0].robloxUsername,
          accounts,
        });
      }
      groups.sort((a, b) => b.accounts.length - a.accounts.length);
      res.json({
        groups: groups.map((group) => ({
          ...group,
          accounts: group.accounts.map((account) => ({
            ...account,
            guildNames: (account.guilds || []).map((id) => names[String(id)] || id),
          })),
        })),
      });
    } catch (err) {
      fail(res, err);
    }
  });

  r.get("/roster", requireStaff, async (req, res) => {
    try {
      const names = await guildNameMap();
      const data = await networkData();
      const stageLookup = new Map(
        data.stages.map((row) => [`${row.guildId}:${row.userId}`, row.text || null])
      );
      const players = data.profiles
        .filter((p) => p.roblox_id || p.robloxId || p.verified_at || p.roblox_username || p.robloxUsername)
        .map((p) => {
          const guildId = p.guild_id || p.guildId;
          const discordId = p.discord_id || p.discordId;
          return {
            discordId,
            displayName: p.display_name || p.displayName,
            robloxUsername: p.roblox_username || p.robloxUsername,
            robloxId: p.roblox_id || p.robloxId,
            profileId: p.profile_id || p.profileId,
            guildId,
            guildName: names[String(guildId)] || guildId || "—",
            region: p.region,
            country: p.country,
            rank: stageLookup.get(`${guildId}:${discordId}`) || null,
            createdAt: p.created_at || p.createdAt,
            updatedAt: p.updated_at || p.updatedAt,
            verifiedAt: p.verified_at || p.verifiedAt,
          };
        })
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
