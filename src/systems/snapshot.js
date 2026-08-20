const profiles = require("./profiles");
const leaderboard = require("./leaderboard");
const lineup = require("./lineup");
const ranking = require("./ranking");
const score = require("./score");
const challenges = require("./challenges");
const blacklist = require("./blacklist");
const trainers = require("./trainers");
const wars = require("./wars");
const { buildCardModel } = require("../lib/cards");
const { regionLabel } = require("../lib/regions");
const { brand } = require("../brand");

function isOnCooldown(playerState) {
  if (!playerState?.cooldownUntil) return false;
  const until = new Date(playerState.cooldownUntil).getTime();
  return Number.isFinite(until) && until > Date.now();
}

function playerBundle(guildId, discordId) {
  const profile = profiles.getProfile(guildId, discordId);
  const record = score.getRecord(guildId, discordId);
  const stage = ranking.getStage(guildId, discordId);
  const challengeStatus = challenges.statusFor(guildId, discordId);
  const playerState = score.getPlayerState(guildId, discordId);
  return {
    discordId,
    profileId: profile?.profile_id || null,
    displayName: profile?.roblox_display_name || profile?.display_name || profile?.roblox_username,
    discordTag: discordId ? `<@${discordId}>` : null,
    robloxUsername: profile?.roblox_username,
    robloxDisplayName: profile?.roblox_display_name,
    robloxId: profile?.roblox_id,
    avatarUrl: profile?.roblox_avatar_url,
    region: profile?.region,
    country: profile?.country || null,
    countryFlag: profile?.country_flag || null,
    host: profile?.region ? regionLabel(profile.region) : null,
    stage: stage || "Unranked",
    wins: record.wins || 0,
    losses: record.losses || 0,
    challengeStatus,
    onCooldown: isOnCooldown(playerState),
    gifUrl: brand.defaultGif,
    hasProfile: !!profile,
  };
}

function cardsFromSlots(guildId, slots, gifUrl) {
  return (slots || []).map((slot) => {
    const player = slot.discordId
      ? { ...playerBundle(guildId, slot.discordId), gifUrl: gifUrl || brand.defaultGif }
      : { gifUrl: gifUrl || brand.defaultGif };
    return buildCardModel(slot.position, player);
  });
}

function publicSnapshot(guildId) {
  const lb = leaderboard.getConfig(guildId);
  const lu = lineup.getConfig(guildId);
  const w = wars.getWars(guildId);

  const lineupBoards = Object.values(lu.regions || {}).map((region) => ({
    key: region.key,
    label: region.label,
    main: cardsFromSlots(guildId, region.slots, lu.cardGifUrl),
    sub: cardsFromSlots(guildId, region.subSlots, lu.cardGifUrl),
  }));

  return {
    guildId,
    brand: { name: brand.name, tagline: brand.tagline, gif: brand.defaultGif },
    leaderboard: {
      setupCompleted: !!lb.setupCompleted,
      gif: lb.cardGifUrl || brand.defaultGif,
      cards: cardsFromSlots(guildId, lb.slots, lb.cardGifUrl),
    },
    lineup: {
      setupCompleted: !!lu.setupCompleted,
      gif: lu.cardGifUrl || brand.defaultGif,
      regions: lineupBoards,
    },
    blacklist: blacklist.listAll(),
    trainers: trainers.listAll(),
    wars: w.wars || [],
  };
}

/** Site-wide boards for a public multi-server bot (no single PUBLIC_GUILD_ID). */
function networkPublic() {
  return {
    guildId: null,
    scope: "network",
    brand: { name: brand.name, tagline: brand.tagline, gif: brand.defaultGif },
    leaderboard: { setupCompleted: false, gif: brand.defaultGif, cards: [] },
    lineup: { setupCompleted: false, gif: brand.defaultGif, regions: [] },
    blacklist: blacklist.listAll(),
    trainers: trainers.listAll(),
    wars: wars.listAll(),
    demo: false,
  };
}

module.exports = { playerBundle, cardsFromSlots, publicSnapshot, networkPublic };
