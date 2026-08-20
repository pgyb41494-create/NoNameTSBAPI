let client = null;

function setClient(next) {
  client = next;
}

function getClient() {
  return client;
}

function discordBotApiBase() {
  return String(process.env.DISCORD_BOT_API || "").replace(/\/$/, "");
}

function apiToken() {
  return process.env.API_TOKEN || process.env.BOT_API_TOKEN || "";
}

async function remoteDiscord(pathname, { method = "GET", body } = {}) {
  const base = discordBotApiBase();
  if (!base) {
    const err = new Error(
      "Set DISCORD_BOT_API on the API service to your bot URL (https://nonametsbbot-production.up.railway.app)."
    );
    err.status = 503;
    throw err;
  }
  let res;
  try {
    res = await fetch(`${base}${pathname}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(apiToken() ? { "x-bot-token": apiToken() } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const fail = new Error(
      `Cannot reach bot at DISCORD_BOT_API (${base}). Bot HTTP returned connection error: ${err.message}`
    );
    fail.status = 503;
    throw fail;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.error ||
        data.message ||
        (res.status === 502
          ? `Bot HTTP is down (502) at ${base}. Redeploy NoNameTSBBot and confirm /health works.`
          : `Discord bot-api ${res.status}`)
    );
    err.status = res.status === 502 ? 503 : res.status;
    throw err;
  }
  return data;
}

function requireClient() {
  if (!client?.isReady?.() && !client?.user) {
    if (discordBotApiBase()) return null;
    const err = new Error(
      "Discord bot API is unreachable. On the API Railway service set DISCORD_BOT_API=https://nonametsbbot-production.up.railway.app"
    );
    err.status = 503;
    throw err;
  }
  return client;
}

function listGuilds() {
  const c = requireClient();
  if (!c) {
    // sync callers exist — prefer local; remote is async via listGuildsAsync
    throw Object.assign(new Error("Use listGuildsAsync when Discord runs on a separate bot-api."), { status: 503 });
  }
  return [...c.guilds.cache.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64, extension: "png" }),
      memberCount: g.memberCount,
    }));
}

async function listGuildsAsync() {
  const c = requireClient();
  if (c) return listGuilds();
  return remoteDiscord("/discord/guilds");
}

async function listChannels(guildId) {
  const c = requireClient();
  if (!c) return remoteDiscord(`/discord/guilds/${guildId}/channels`);
  const guild = await c.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();
  return [...channels.values()]
    .filter((ch) => ch && (ch.type === 0 || ch.type === 4 || ch.type === 5 || ch.type === 15 || ch.type === 16))
    .map((ch) => ({
      id: ch.id,
      name: ch.name,
      type:
        ch.type === 4
          ? "category"
          : ch.type === 5
            ? "announcement"
            : ch.type === 15
              ? "forum"
              : ch.type === 16
                ? "media"
                : "text",
      parentId: ch.parentId || null,
      position: ch.rawPosition ?? ch.position ?? 0,
      topic: ch.topic || null,
      availableTags: Array.isArray(ch.availableTags)
        ? ch.availableTags.map((tag) => ({
            id: String(tag.id),
            name: tag.name,
            emoji: tag.emoji?.name || tag.emoji?.id || null,
            moderated: !!tag.moderated,
          }))
        : [],
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name));
}

async function createChannel(guildId, body = {}) {
  const c = requireClient();
  if (!c) {
    return remoteDiscord(`/discord/guilds/${guildId}/channels`, { method: "POST", body: body || {} });
  }
  const guild = await c.guilds.fetch(guildId);
  const name =
    String(body.name || "logs")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "logs";
  const created = await guild.channels.create({
    name,
    type: 0,
    reason: "Created from Ascendant dashboard",
  });
  return { id: created.id, name: created.name, type: "text" };
}

async function searchMembers(guildId, query = "") {
  const c = requireClient();
  if (!c) {
    const q = encodeURIComponent(String(query || ""));
    return remoteDiscord(`/discord/guilds/${guildId}/members?q=${q}`);
  }
  const guild = await c.guilds.fetch(guildId);
  const q = String(query || "").trim();
  if (q) {
    const found = await guild.members.search({ query: q, limit: 20 }).catch(() => null);
    if (found) {
      return [...found.values()].map(publicMember);
    }
  }
  await guild.members.fetch({ limit: 100 }).catch(() => {});
  return [...guild.members.cache.values()]
    .filter((m) => !m.user.bot)
    .sort((a, b) => String(a.displayName || "").localeCompare(String(b.displayName || "")))
    .slice(0, 100)
    .map(publicMember);
}

function publicMember(member) {
  const { userAvatarFromDiscord } = require("./lib/discordUser");
  return {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    avatar: userAvatarFromDiscord(member.user, 128) || member.displayAvatarURL({ size: 128 }),
  };
}

async function sendChannelMessage(guildId, channelId, contentOrPayload, maybeEmbed) {
  const messageBody =
    contentOrPayload && typeof contentOrPayload === "object" && !Array.isArray(contentOrPayload)
      ? contentOrPayload
      : { content: contentOrPayload, embed: maybeEmbed };
  const { buildMessagePayload } = require("./lib/messagePayload");
  const payload = buildMessagePayload(messageBody);

  const c = requireClient();
  if (!c) {
    return remoteDiscord(`/discord/guilds/${guildId}/channels/${channelId}/messages`, {
      method: "POST",
      body: payload,
    });
  }
  const channel = await c.channels.fetch(channelId);
  if (!channel || !channel.isTextBased?.()) {
    throw Object.assign(new Error("That channel cannot receive messages."), { status: 400 });
  }
  if (guildId && channel.guildId && String(channel.guildId) !== String(guildId)) {
    throw Object.assign(new Error("Channel is not in that server."), { status: 400 });
  }
  const sent = await channel.send(payload);
  return publicMessage(sent);
}

function publicMessage(message) {
  const { userAvatarFromDiscord } = require("./lib/discordUser");
  const author = message.author;
  return {
    id: String(message.id),
    content: message.content || "",
    createdAt: message.createdAt?.toISOString?.() || null,
    editedAt: message.editedAt?.toISOString?.() || null,
    author: {
      id: String(author?.id || ""),
      username: author?.username || "unknown",
      displayName: message.member?.displayName || author?.globalName || author?.username || "unknown",
      avatar: author ? userAvatarFromDiscord(author, 64) : null,
      bot: !!author?.bot,
    },
    embeds: (message.embeds || []).slice(0, 10).map((embed) => {
      try {
        return typeof embed.toJSON === "function" ? embed.toJSON() : embed;
      } catch {
        return {
          title: embed.title || null,
          description: embed.description || null,
          color: embed.color ?? null,
          url: embed.url || null,
          footer: embed.footer || null,
          image: embed.image || null,
          thumbnail: embed.thumbnail || null,
        };
      }
    }),
    attachments: [...(message.attachments?.values?.() || [])].map((file) => ({
      id: String(file.id),
      name: file.name,
      url: file.url,
      contentType: file.contentType || null,
      width: file.width || null,
      height: file.height || null,
    })),
    mentions: [...(message.mentions?.users?.values?.() || [])].map((user) => ({
      id: String(user.id),
      username: user.username,
      displayName: user.globalName || user.username,
    })),
  };
}

async function listChannelMessages(guildId, channelId, { limit = 50, before = null } = {}) {
  const c = requireClient();
  if (!c) {
    const q = new URLSearchParams();
    if (limit) q.set("limit", String(limit));
    if (before) q.set("before", String(before));
    const suffix = q.toString() ? `?${q}` : "";
    return remoteDiscord(`/discord/guilds/${guildId}/channels/${channelId}/messages${suffix}`);
  }
  const channel = await c.channels.fetch(channelId);
  if (!channel || !channel.isTextBased?.()) {
    throw Object.assign(new Error("That channel cannot receive messages."), { status: 400 });
  }
  if (guildId && channel.guildId && String(channel.guildId) !== String(guildId)) {
    throw Object.assign(new Error("Channel is not in that server."), { status: 400 });
  }
  const cap = Math.min(100, Math.max(1, Number(limit) || 50));
  const fetched = await channel.messages.fetch({
    limit: cap,
    ...(before ? { before: String(before) } : {}),
  });
  const messages = [...fetched.values()]
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map(publicMessage);
  return { messages };
}

async function triggerTyping(guildId, channelId) {
  const c = requireClient();
  if (!c) {
    return remoteDiscord(`/discord/guilds/${guildId}/channels/${channelId}/typing`, { method: "POST", body: {} });
  }
  const channel = await c.channels.fetch(channelId);
  if (!channel || !channel.isTextBased?.()) {
    throw Object.assign(new Error("That channel cannot receive messages."), { status: 400 });
  }
  if (guildId && channel.guildId && String(channel.guildId) !== String(guildId)) {
    throw Object.assign(new Error("Channel is not in that server."), { status: 400 });
  }
  await channel.sendTyping();
  return { ok: true };
}

async function getTyping(guildId, channelId) {
  const c = requireClient();
  if (!c) {
    return remoteDiscord(`/discord/guilds/${guildId}/channels/${channelId}/typing`);
  }
  // Local client path is unused on the API service; typing lives on the bot process.
  return { typing: [] };
}

async function listForumPosts(guildId, channelId) {
  return remoteDiscord(`/discord/guilds/${guildId}/channels/${channelId}/posts`);
}

async function createForumPost(guildId, channelId, body = {}) {
  return remoteDiscord(`/discord/guilds/${guildId}/channels/${channelId}/posts`, {
    method: "POST",
    body: body || {},
  });
}

async function sendDirectMessage(userId, contentOrPayload, maybeEmbed) {
  const messageBody =
    contentOrPayload && typeof contentOrPayload === "object" && !Array.isArray(contentOrPayload)
      ? contentOrPayload
      : { content: contentOrPayload, embed: maybeEmbed };
  const { buildMessagePayload } = require("./lib/messagePayload");
  const payload = buildMessagePayload(messageBody);

  const c = requireClient();
  if (!c) {
    return remoteDiscord(`/discord/users/${userId}/messages`, {
      method: "POST",
      body: payload,
    });
  }
  const user = await c.users.fetch(userId);
  const sent = await user.send(payload);
  return { id: sent.id, userId: user.id };
}

async function fetchUser(userId) {
  const { publicUser, forceGifIfAnimated } = require("./lib/discordUser");
  const c = requireClient();
  if (!c) {
    const remote = await remoteDiscord(`/discord/users/${userId}`);
    if (remote?.avatar) remote.avatar = forceGifIfAnimated(remote.avatar);
    return remote;
  }
  const user = await c.users.fetch(userId, { force: true });
  return publicUser(user, 256);
}

function localVerifyStore() {
  return null;
}

function publicRole(role, guildId) {
  return {
    id: role.id,
    name: role.name,
    color: role.hexColor || null,
    position: role.position,
    managed: !!role.managed,
    everyone: role.id === guildId,
    hoisted: !!role.hoist,
  };
}

async function listRoles(guildId) {
  const c = requireClient();
  if (!c) return remoteDiscord(`/discord/guilds/${guildId}/roles`);
  const guild = await c.guilds.fetch(guildId);
  const roles = await guild.roles.fetch();
  return [...roles.values()]
    .filter((role) => role && role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .map((role) => publicRole(role, guild.id));
}

async function getVerifyConfig(guildId) {
  const local = localVerifyStore();
  if (local) return local.publicConfig(guildId);
  return remoteDiscord(`/discord/guilds/${guildId}/verify`);
}

async function setVerifyConfig(guildId, body) {
  const local = localVerifyStore();
  if (local) {
    local.applyPublicPatch(guildId, body || {});
    return local.publicConfig(guildId);
  }
  return remoteDiscord(`/discord/guilds/${guildId}/verify`, { method: "PUT", body: body || {} });
}

function localOpsStore() {
  return null;
}

async function getAuditConfig(guildId) {
  const local = localOpsStore();
  if (local) return local.publicAudit(guildId);
  return remoteDiscord(`/discord/guilds/${guildId}/audit`);
}

async function setAuditConfig(guildId, body) {
  const local = localOpsStore();
  if (local) {
    local.applyAuditPatch(guildId, body || {});
    return local.publicAudit(guildId);
  }
  return remoteDiscord(`/discord/guilds/${guildId}/audit`, { method: "PUT", body: body || {} });
}

async function getInvitesConfig(guildId) {
  const local = localOpsStore();
  if (local) return local.publicInvites(guildId);
  return remoteDiscord(`/discord/guilds/${guildId}/invites`);
}

async function setInvitesConfig(guildId, body) {
  const local = localOpsStore();
  if (local) {
    local.applyInvitesPatch(guildId, body || {});
    return local.publicInvites(guildId);
  }
  return remoteDiscord(`/discord/guilds/${guildId}/invites`, { method: "PUT", body: body || {} });
}

async function listPanels(guildId) {
  return remoteDiscord(`/discord/guilds/${guildId}/panels`);
}

async function replacePanels(guildId, body) {
  return remoteDiscord(`/discord/guilds/${guildId}/panels`, { method: "PUT", body: body || {} });
}

async function postStaffAlert(guildId, event, payload = {}) {
  return remoteDiscord(`/discord/guilds/${guildId}/alerts/post`, {
    method: "POST",
    body: { event: String(event), ...payload },
  });
}

function postStaffAlertBackground(guildId, event, payload) {
  postStaffAlert(guildId, event, payload).catch((err) => {
    console.warn("[botBridge] staff alert failed:", err.message);
  });
}

async function getStaffAlertsConfig(guildId) {
  return remoteDiscord(`/discord/guilds/${guildId}/alerts`);
}

async function setStaffAlertsConfig(guildId, body) {
  return remoteDiscord(`/discord/guilds/${guildId}/alerts`, { method: "PUT", body: body || {} });
}

async function refreshBoards(guildId, userId) {
  const body = userId ? { userId: String(userId) } : {};
  return remoteDiscord(`/discord/guilds/${guildId}/boards/refresh`, { method: "POST", body });
}

function refreshBoardsBackground(guildId, userId) {
  refreshBoards(guildId, userId).catch((err) => {
    console.warn("[botBridge] board refresh failed:", err.message);
  });
}

async function getNetworkSnapshot() {
  return remoteDiscord("/discord/network/snapshot");
}

module.exports = {
  setClient,
  getClient,
  listGuilds,
  listGuildsAsync,
  listChannels,
  listRoles,
  searchMembers,
  fetchUser,
  sendChannelMessage,
  sendDirectMessage,
  listChannelMessages,
  triggerTyping,
  getTyping,
  listForumPosts,
  createForumPost,
  getVerifyConfig,
  setVerifyConfig,
  getAuditConfig,
  setAuditConfig,
  getInvitesConfig,
  setInvitesConfig,
  listPanels,
  replacePanels,
  createChannel,
  refreshBoards,
  refreshBoardsBackground,
  postStaffAlert,
  postStaffAlertBackground,
  getStaffAlertsConfig,
  setStaffAlertsConfig,
  getNetworkSnapshot,
};
