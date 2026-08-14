let client = null;

function setClient(next) {
  client = next;
}

function getClient() {
  return client;
}

function requireClient() {
  if (!client?.isReady?.() && !client?.user) {
    const err = new Error("The Discord bot is offline. Start NoNameBot so the dashboard can talk to servers.");
    err.status = 503;
    throw err;
  }
  return client;
}

function listGuilds() {
  const c = requireClient();
  return [...c.guilds.cache.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64, extension: "png" }),
      memberCount: g.memberCount,
    }));
}

async function listChannels(guildId) {
  const c = requireClient();
  const guild = await c.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();
  return [...channels.values()]
    .filter((ch) => ch && (ch.type === 0 || ch.type === 5))
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
    .map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type === 5 ? "announcement" : "text",
    }));
}

async function searchMembers(guildId, query = "") {
  const c = requireClient();
  const guild = await c.guilds.fetch(guildId);
  const q = String(query || "").trim();
  if (q) {
    const found = await guild.members.search({ query: q, limit: 20 }).catch(() => null);
    if (found) {
      return [...found.values()].map(publicMember);
    }
  }
  await guild.members.fetch({ limit: 40 }).catch(() => {});
  return [...guild.members.cache.values()]
    .filter((m) => !m.user.bot)
    .slice(0, 40)
    .map(publicMember);
}

function publicMember(member) {
  return {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    avatar: member.displayAvatarURL({ size: 64 }),
  };
}

async function sendChannelMessage(guildId, channelId, content) {
  const c = requireClient();
  const channel = await c.channels.fetch(channelId);
  if (!channel || !channel.isTextBased?.()) {
    throw Object.assign(new Error("That channel cannot receive messages."), { status: 400 });
  }
  if (guildId && channel.guildId && String(channel.guildId) !== String(guildId)) {
    throw Object.assign(new Error("Channel is not in that server."), { status: 400 });
  }
  const sent = await channel.send({ content: String(content).slice(0, 2000) });
  return { id: sent.id, channelId: sent.channelId };
}

async function sendDirectMessage(userId, content) {
  const c = requireClient();
  const user = await c.users.fetch(userId);
  const sent = await user.send({ content: String(content).slice(0, 2000) });
  return { id: sent.id, userId: user.id };
}

module.exports = {
  setClient,
  getClient,
  listGuilds,
  listChannels,
  searchMembers,
  sendChannelMessage,
  sendDirectMessage,
};
