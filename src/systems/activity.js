const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("activity.json", { events: [] });
const MAX = 800;

const TITLES = {
  profile: "Profile registered",
  phase: "Rank updated",
  score: "Match scored",
  challenge: "Challenge opened",
  duplicateRoblox: "Duplicate Roblox",
};

function compactOthers(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, 12).map((row) => ({
    discordId: String(row.discord_id || row.discordId || ""),
    robloxUsername: row.roblox_username || row.robloxUsername || null,
    profileId: row.profile_id || row.profileId || null,
    guildId: row.guild_id || row.guildId || null,
  }));
}

function compactPayload(event, payload = {}) {
  if (event === "duplicateRoblox") {
    return {
      primaryDiscordId: payload.primaryDiscordId || null,
      robloxId: payload.robloxId || null,
      robloxUsername: payload.robloxUsername || null,
      others: compactOthers(payload.others),
    };
  }
  return { ...payload };
}

function mention(id) {
  return id ? String(id) : "someone";
}

function summarize(event, payload = {}) {
  if (event === "profile") {
    return `${mention(payload.discordId)} linked ${payload.roblox_username || payload.robloxUsername || "a Roblox account"}`;
  }
  if (event === "phase") {
    const by = payload.actorId ? ` by ${mention(payload.actorId)}` : "";
    return `${mention(payload.targetId)} → ${payload.stage || "?"}${by}`;
  }
  if (event === "score") {
    return `${mention(payload.winnerId)} beat ${mention(payload.loserId)} ${payload.score || ""}`.trim();
  }
  if (event === "challenge") {
    return `${mention(payload.fromId)} challenged ${mention(payload.targetId)}`;
  }
  if (event === "duplicateRoblox") {
    const extra = compactOthers(payload.others).length;
    return `${payload.robloxUsername || payload.robloxId || "Roblox"} is linked to ${extra + 1} Discord accounts`;
  }
  return event;
}

function record(guildId, event, payload = {}) {
  if (!guildId || !event) return null;
  const compact = compactPayload(event, payload);
  let created = null;
  store.updateSync((db) => {
    if (!db.events) db.events = [];
    created = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      guildId: String(guildId),
      event: String(event),
      title: TITLES[event] || String(event),
      summary: summarize(event, compact),
      payload: compact,
    };
    db.events = [created, ...db.events].slice(0, MAX);
    return db;
  });
  return created;
}

function list({ event = null, guildId = null, limit = 200 } = {}) {
  const cap = Math.min(500, Math.max(1, Number(limit) || 200));
  let rows = store.load().events || [];
  if (event) rows = rows.filter((row) => row.event === event);
  if (guildId && guildId !== "network") {
    rows = rows.filter((row) => String(row.guildId) === String(guildId));
  }
  return rows.slice(0, cap);
}

function eventKey(row) {
  const payload = row.payload || {};
  const subject =
    payload.discordId ||
    payload.targetId ||
    payload.primaryDiscordId ||
    payload.winnerId ||
    payload.fromId ||
    "";
  return `${row.event}:${row.guildId}:${subject}:${row.at || ""}`;
}

function mergeWithHistorical(live, historical) {
  const seen = new Set();
  const out = [];
  for (const row of [...live, ...historical]) {
    const key = eventKey(row);
    if (seen.has(key)) continue;
    // Collapse live + historical copies of the same profile/rank subject
    if (row.event === "profile" || row.event === "phase") {
      const soft =
        `${row.event}:${row.guildId}:` +
        (row.payload?.discordId || row.payload?.targetId || row.id);
      if (seen.has(soft)) continue;
      seen.add(soft);
    }
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

function historicalFromData({ profiles = [], stages = [], matches = [] } = {}) {
  const historical = [];
  for (const profile of profiles) {
    if (!profile?.roblox_username && !profile?.roblox_id && !profile?.verified_at && !profile?.profile_id) {
      continue;
    }
    const guildId = String(profile.guild_id || profile.guildId || "global");
    const discordId = String(profile.discord_id || profile.discordId || "");
    if (!discordId) continue;
    historical.push({
      id: `hist-profile-${guildId}-${discordId}`,
      at: profile.verified_at || profile.created_at || profile.updated_at || null,
      guildId,
      event: "profile",
      title: "Profile registered",
      summary: summarize("profile", {
        discordId,
        roblox_username: profile.roblox_username || profile.robloxUsername,
      }),
      payload: {
        discordId,
        roblox_username: profile.roblox_username || profile.robloxUsername || null,
        region: profile.region || null,
        country: profile.country || null,
      },
    });
  }
  for (const row of stages) {
    const guildId = String(row.guildId || "");
    const userId = String(row.userId || "");
    if (!guildId || !userId) continue;
    historical.push({
      id: `hist-phase-${guildId}-${userId}`,
      at: row.at || null,
      guildId,
      event: "phase",
      title: "Rank updated",
      summary: summarize("phase", { targetId: userId, stage: row.text, actorId: row.setBy }),
      payload: { targetId: userId, stage: row.text, actorId: row.setBy },
    });
  }
  for (const match of matches) {
    const guildId = String(match.guildId || "");
    if (!guildId || !match.winnerId || !match.loserId) continue;
    historical.push({
      id: `hist-score-${guildId}-${match.id || `${match.winnerId}-${match.at}`}`,
      at: match.at || null,
      guildId,
      event: "score",
      title: "Match scored",
      summary: summarize("score", {
        winnerId: match.winnerId,
        loserId: match.loserId,
        score: match.score,
      }),
      payload: {
        winnerId: match.winnerId,
        loserId: match.loserId,
        score: match.score,
        region: match.region || null,
        recorderId: match.refereeIds?.[0] || null,
      },
    });
  }
  return historical;
}

module.exports = {
  record,
  list,
  mergeWithHistorical,
  historicalFromData,
  TITLES,
};
