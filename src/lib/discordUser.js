/**
 * Build Discord CDN avatar URLs that keep animated (GIF) avatars working.
 */
function defaultAvatarIndex(userId) {
  try {
    return Number((BigInt(String(userId)) >> 22n) % 6n);
  } catch {
    return 0;
  }
}

function discordAvatarUrl(userId, avatarHash, size = 256) {
  const id = String(userId || "").trim();
  if (!id) return null;
  if (!avatarHash) {
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(id)}.png`;
  }
  const hash = String(avatarHash);
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=${size}`;
}

/** Prefer live discord.js URL; force GIF when the avatar is animated. */
function userAvatarFromDiscord(user, size = 256) {
  if (!user) return null;
  if (user.avatar && String(user.avatar).startsWith("a_")) {
    return discordAvatarUrl(user.id, user.avatar, size);
  }
  if (typeof user.displayAvatarURL === "function") {
    return user.displayAvatarURL({
      size,
      extension: user.avatar?.startsWith?.("a_") ? "gif" : "png",
      forceStatic: false,
    });
  }
  return discordAvatarUrl(user.id, user.avatar, size);
}

function publicUser(user, size = 256) {
  return {
    id: String(user.id),
    username: user.username,
    displayName: user.globalName || user.displayName || user.username,
    avatar: userAvatarFromDiscord(user, size),
  };
}

module.exports = { discordAvatarUrl, userAvatarFromDiscord, publicUser, defaultAvatarIndex };
