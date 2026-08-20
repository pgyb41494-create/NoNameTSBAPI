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
    return `${mention(payload.discordId)} linked ${payload.roblox_username || "a Roblox account"}`;
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
  return `${row.event}:${row.guildId}:${subject}`;
}

function mergeWithHistorical(live, historical) {
  const seen = new Set(live.map(eventKey));
  const extra = historical.filter((row) => !seen.has(eventKey(row)));
  return [...live, ...extra].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

module.exports = { record, list, mergeWithHistorical, TITLES };
