const { regionLabel, regionShort } = require("./regions");
const { brand } = require("../brand");

/** Discohook vacant accent (3750465) */
const VACANT_COLOR = 3750465;
/** Near-black accent bar like the reference embeds (color: 1) */
const CARD_COLOR = 1;

function formatCountry(profile) {
  if (!profile) return "—";
  if (profile.country) return `${profile.country} ${profile.country_flag || ""}`.trim();
  return profile.country_flag || "—";
}

function cardStatus(entry) {
  if (entry?.challengeStatus === "challenged") return "Being Challenged";
  if (entry?.onCooldown) return "On Cooldown";
  if (!entry?.discordId) return "Empty";
  return "Challengeable";
}

/** Prefer durable Png headshots; unwrap Discord CDN proxies that break. */
function sanitizeThumbnail(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (!u) return null;

  const proxied = u.match(/\/external\/[^/]+\/(https?)\/(.+)$/i);
  if (proxied) {
    u = `${proxied[1]}://${decodeURIComponent(proxied[2])}`;
    u = u.replace(/\?format=webp.*$/i, "");
  }

  u = u.replace(/\/Webp\//gi, "/Png/");
  u = u.replace(/format=webp/gi, "format=png");
  return u;
}

function robloxProfileUrl(player) {
  if (player.robloxId) return `https://www.roblox.com/users/${player.robloxId}/profile`;
  if (player.robloxUsername) {
    return `https://www.roblox.com/users/profile?username=${encodeURIComponent(player.robloxUsername)}`;
  }
  return null;
}

function buildCardModel(position, player = {}) {
  const empty = !player.discordId;
  const robloxUsername = player.robloxUsername || null;
  const name = empty
    ? "Vacant"
    : player.displayName ||
      player.robloxDisplayName ||
      robloxUsername ||
      player.discordName ||
      "???";
  const url = robloxProfileUrl(player);
  const robloxTag = robloxUsername ? `.${robloxUsername}.` : empty ? ".Vacant." : ".???.";

  return {
    position,
    id: player.profileId || null,
    name,
    discordId: player.discordId || null,
    discordTag: player.discordTag || (player.discordId ? `<@${player.discordId}>` : null),
    robloxUsername,
    robloxTag,
    robloxUrl: url,
    robloxId: player.robloxId || null,
    region: player.regionShort || regionShort(player.region) || regionLabel(player.region) || (empty ? "-" : "—"),
    regionFull: regionLabel(player.region),
    host: player.host || player.country || regionLabel(player.region) || null,
    country: player.country || null,
    countryFlag: player.countryFlag || null,
    stage: empty ? "-" : player.stage || "Unranked",
    status: cardStatus(player),
    wins: player.wins || 0,
    losses: player.losses || 0,
    avatarUrl: sanitizeThumbnail(player.avatarUrl || null),
    gifUrl: player.gifUrl || brand.defaultGif,
    empty,
    color: empty ? VACANT_COLOR : CARD_COLOR,
  };
}

function robloxMarkdown(card) {
  if (card.empty) return ".Vacant.";
  const label = card.robloxUsername || card.name || "???";
  if (card.robloxUrl) return `.[${label}](${card.robloxUrl}).`;
  return card.robloxTag || ".???.";
}

/**
 * Leaderboard card body (matches Discohook reference).
 * Lineup omits ID / status / W-L.
 */
function formatCardDescription(card, { mode = "leaderboard" } = {}) {
  if (card.empty) {
    return ["| Vacant |", `<< | ${robloxMarkdown(card)} | >>`, "Region: -", "Stage: -"].join("\n");
  }

  const mention = card.discordTag || "`empty`";
  const lines = [`| ${mention} |`, `<< | ${robloxMarkdown(card)} | >>`, `Region: **${card.region || "—"}**`, `Stage: **${card.stage || "Unranked"}**`];

  if (mode === "lineup") return lines.join("\n");

  return [
    `-# Code: ${card.id != null ? card.id : "—"}`,
    ...lines,
    `-# Status: ${card.status}`,
    `-# wins: ${card.wins} losses: ${card.losses}`,
  ].join("\n");
}

function cardTitle(card) {
  return `#${card.position} ${card.empty ? "Vacant" : card.name}`;
}

module.exports = {
  formatCountry,
  cardStatus,
  buildCardModel,
  formatCardDescription,
  sanitizeThumbnail,
  cardTitle,
  CARD_COLOR,
  VACANT_COLOR,
};
