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
const { brand } = require("../brand");

function playerBundle(guildId, discordId) {
  const profile = profiles.getProfile(guildId, discordId);
  const record = score.getRecord(guildId, discordId);
  const stage = ranking.getStage(guildId, discordId);
  const challengeStatus = challenges.statusFor(guildId, discordId);
  return {
    discordId,
    profileId: profile?.profile_id || null,
    displayName: profile?.roblox_display_name || profile?.display_name || profile?.roblox_username,
    robloxUsername: profile?.roblox_username,
    robloxDisplayName: profile?.roblox_display_name,
    robloxId: profile?.roblox_id,
    avatarUrl: profile?.roblox_avatar_url,
    region: profile?.region,
    stage: stage || "Unranked",
    wins: record.wins || 0,
    losses: record.losses || 0,
    challengeStatus,
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
  const bl = blacklist.getList(guildId);
  const tr = trainers.getList(guildId);
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
    blacklist: bl.entries || [],
    trainers: (tr.trainers || []).map((t) => ({
      ...t,
      profile: profiles.publicProfile(profiles.getProfile(guildId, t.discordId)),
    })),
    wars: w.wars || [],
  };
}

module.exports = { playerBundle, cardsFromSlots, publicSnapshot };
