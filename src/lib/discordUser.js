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

function avatarHashOf(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  if (!s.startsWith("http")) return s;
  const match = s.match(/\/avatars\/\d+\/(a_[^/?#.]+|[A-Fa-f0-9]+)(?:\.[a-z0-9]+)?/i);
  return match ? match[1] : null;
}

function discordAvatarUrl(userId, avatarHash, size = 256) {
  const id = String(userId || "").trim();
  if (!id) return null;
  const safeSize = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096].includes(Number(size))
    ? Number(size)
    : 256;
  const hash = avatarHashOf(avatarHash);
  if (!hash) {
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(id)}.png`;
  }
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=${safeSize}`;
}

/** Rewrite any Discord CDN avatar URL so animated hashes use .gif */
function forceGifIfAnimated(url) {
  if (!url) return url;
  return String(url).replace(
    /(\/avatars\/\d+\/a_[^/?#.]+)\.(webp|png|jpg|jpeg)(\?|$)/i,
    "$1.gif$3"
  );
}

function avatarCandidateUrls(userId, user = {}) {
  const id = String(userId || user.id || "").trim();
  const hash = avatarHashOf(user.avatarHash || user.avatar);
  const urls = [];
  const fromUser = forceGifIfAnimated(user.avatar);
  if (fromUser && String(fromUser).startsWith("http")) urls.push(fromUser);
  if (id && hash) {
    if (hash.startsWith("a_")) {
      urls.push(`https://cdn.discordapp.com/avatars/${id}/${hash}.gif?size=256`);
      urls.push(`https://cdn.discordapp.com/avatars/${id}/${hash}.gif?size=128`);
      urls.push(`https://cdn.discordapp.com/avatars/${id}/${hash}.webp?size=256`);
      urls.push(`https://cdn.discordapp.com/avatars/${id}/${hash}.gif`);
    } else {
      urls.push(discordAvatarUrl(id, hash, 256));
    }
  }
  return [...new Set(urls.filter(Boolean))];
}

/** Always build from hash — never trust displayAvatarURL extension defaults. */
function userAvatarFromDiscord(user, size = 256) {
  if (!user) return null;
  const hash = avatarHashOf(user.avatar ?? user.avatarHash ?? null);
  if (hash) return discordAvatarUrl(user.id, hash, size);
  if (typeof user.displayAvatarURL === "function") {
    return forceGifIfAnimated(
      user.displayAvatarURL({
        size,
        extension: String(user.avatar || "").startsWith("a_") ? "gif" : "png",
        forceStatic: false,
      })
    );
  }
  return discordAvatarUrl(user.id, null, size);
}

function publicUser(user, size = 256) {
  const hash = avatarHashOf(
    user.avatar && typeof user.avatar === "string" && !user.avatar.startsWith("http")
      ? user.avatar
      : user.avatarHash || user.avatar || null
  );
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
  avatarHashOf,
  avatarCandidateUrls,
};
