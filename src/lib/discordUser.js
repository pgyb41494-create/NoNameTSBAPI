/**
 * Build Discord CDN avatar URLs that keep animated (GIF) avatars working.
 * Animated hashes always start with `a_` — those MUST use `.gif` (not png/webp).
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
  const safeSize = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096].includes(Number(size))
    ? Number(size)
    : 256;
  if (!avatarHash) {
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(id)}.png`;
  }
  const hash = String(avatarHash);
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=${safeSize}`;
}

/** Rewrite any Discord CDN avatar URL so animated hashes use .gif */
function forceGifIfAnimated(url) {
  if (!url) return url;
  const s = String(url);
  // /avatars/{id}/a_xxx.webp|png → .gif
  if (/\/avatars\/\d+\/a_[a-f0-9]+\.(webp|png)(\?|$)/i.test(s)) {
    return s.replace(/\.(webp|png)(\?|$)/i, ".gif$2");
  }
  return s;
}

/** Always build from hash — never trust displayAvatarURL extension defaults. */
function userAvatarFromDiscord(user, size = 256) {
  if (!user) return null;
  const hash = user.avatar ?? user.avatarHash ?? null;
  if (hash && typeof hash === "string" && !hash.startsWith("http")) {
    return discordAvatarUrl(user.id, hash, size);
  }
  if (typeof user.displayAvatarURL === "function") {
    return forceGifIfAnimated(
      user.displayAvatarURL({
        size,
        extension: user.avatar?.startsWith?.("a_") ? "gif" : "png",
        forceStatic: false,
      })
    );
  }
  if (typeof hash === "string" && hash.startsWith("http")) {
    return forceGifIfAnimated(hash);
  }
  return discordAvatarUrl(user.id, null, size);
}

function publicUser(user, size = 256) {
  const hash =
    user.avatar && typeof user.avatar === "string" && !user.avatar.startsWith("http")
      ? user.avatar
      : user.avatarHash || null;
  return {
    id: String(user.id),
    username: user.username,
    displayName: user.globalName || user.global_name || user.displayName || user.username,
    avatarHash: hash,
    avatar: userAvatarFromDiscord(user, size),
    animated: !!(hash && String(hash).startsWith("a_")),
  };
}

module.exports = {
  discordAvatarUrl,
  userAvatarFromDiscord,
  publicUser,
  defaultAvatarIndex,
  forceGifIfAnimated,
};
