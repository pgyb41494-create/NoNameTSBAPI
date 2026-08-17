const { isStaff, clientId } = require("../auth");
const bridge = require("../botBridge");

const ADMIN = 0x8n;
const MANAGE_GUILD = 0x20n;
const cache = new Map();

function inviteUrl(guildId) {
  const id = clientId();
  if (!id) return "";
  const params = new URLSearchParams({
    client_id: id,
    permissions: "8",
    scope: "bot applications.commands",
    ...(guildId ? { guild_id: String(guildId), disable_guild_select: "true" } : {}),
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

function discordIcon(id, icon) {
  if (!icon) return null;
  const ext = String(icon).startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=64`;
}

function isDiscordAdmin(guild) {
  if (guild?.owner) return true;
  try {
    const perms = BigInt(guild.permissions || 0);
    return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

async function fetchDiscordGuilds(accessToken) {
  if (!accessToken) return [];
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function userAdminGuilds(session) {
  const key = String(session.id);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 45_000) return hit.guilds;
  const guilds = (await fetchDiscordGuilds(session.discordAccess)).filter(isDiscordAdmin);
  cache.set(key, { at: Date.now(), guilds });
  return guilds;
}

function publicGuild(g, { botPresent }) {
  return {
    id: String(g.id),
    name: g.name,
    icon: g.icon || null,
    memberCount: g.memberCount || null,
    botPresent: !!botPresent,
    inviteUrl: inviteUrl(g.id),
  };
}

async function listDashboardGuilds(session) {
  let botGuilds = await bridge.listGuildsAsync().catch(() => []);
  if (!Array.isArray(botGuilds)) botGuilds = botGuilds.guilds || [];
  const botMap = new Map(botGuilds.map((g) => [String(g.id), g]));
  const byId = new Map();

  for (const g of await userAdminGuilds(session)) {
    const bot = botMap.get(String(g.id));
    byId.set(String(g.id), {
      id: String(g.id),
      name: g.name,
      icon: bot?.icon || discordIcon(g.id, g.icon),
      memberCount: bot?.memberCount || null,
      botPresent: !!bot,
      inviteUrl: inviteUrl(g.id),
    });
  }

  if (isStaff(session.id)) {
    for (const g of botGuilds) {
      const existing = byId.get(String(g.id));
      if (existing) {
        existing.botPresent = true;
        existing.memberCount = g.memberCount;
        existing.icon = g.icon || existing.icon;
      } else {
        byId.set(String(g.id), publicGuild(g, { botPresent: true }));
      }
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.botPresent !== b.botPresent) return a.botPresent ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
}

async function canConfigureGuild(session, guildId) {
  const id = String(guildId || "");
  if (!id || id === "network") return false;
  // Bot owners can configure every server the bot is in — no Discord Admin required.
  if (isStaff(session?.id)) return true;
  const guilds = await listDashboardGuilds(session);
  return guilds.some((g) => g.id === id && g.botPresent);
}

module.exports = {
  listDashboardGuilds,
  canConfigureGuild,
  inviteUrl,
};
