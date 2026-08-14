const { regionLabel, regionShort } = require("./regions");
const { brand } = require("../brand");

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

function buildCardModel(position, player = {}) {
  const name =
    player.displayName ||
    player.robloxDisplayName ||
    player.robloxUsername ||
    player.discordName ||
    "???";
  const robloxTag = player.robloxUsername ? `.${player.robloxUsername}.` : ".???.";

  return {
    position,
    id: player.profileId || null,
    name,
    discordId: player.discordId || null,
    discordTag: player.discordTag || (player.discordId ? `<@${player.discordId}>` : null),
    robloxTag,
    robloxUrl: player.robloxId ? `https://www.roblox.com/users/${player.robloxId}/profile` : null,
    region: player.regionShort || regionShort(player.region) || regionLabel(player.region),
    regionFull: regionLabel(player.region),
    stage: player.stage || "Unranked",
    status: cardStatus(player),
    wins: player.wins || 0,
    losses: player.losses || 0,
    avatarUrl: player.avatarUrl || null,
    gifUrl: player.gifUrl || brand.defaultGif,
    empty: !player.discordId,
  };
}

function formatCardDescription(card) {
  const idLine = card.id ? `ID: ${card.id}` : "ID: —";
  const mention = card.discordTag || "`empty`";
  return [
    `# #${card.position} ${card.name}`,
    idLine,
    `<< | ${mention} | >>`,
    `<< | ${card.robloxTag} | >>`,
    `**Region:** ${card.region}`,
    `**Stage:** ${card.stage}`,
    `**Status:** ${card.status}`,
    `wins: ${card.wins} losses: ${card.losses}`,
  ].join("\n");
}

module.exports = { formatCountry, cardStatus, buildCardModel, formatCardDescription };
