const { createJsonStore } = require("../store/jsonStore");
const { resolveRobloxUser, checkRobloxBio } = require("../lib/roblox");
const { getCharacterLabel } = require("../lib/characters");
const { regionLabel } = require("../lib/regions");

const store = createJsonStore("profiles.json", { nextId: 100, users: {} });

function keyFor(guildId, discordId) {
  return `${guildId || "global"}:${discordId}`;
}

function emptyProfile(discordId, guildId) {
  return {
    discord_id: String(discordId),
    guild_id: guildId || null,
    profile_id: null,
    display_name: null,
    roblox_username: null,
    roblox_display_name: null,
    roblox_id: null,
    roblox_avatar_url: null,
    region: null,
    country: null,
    country_flag: null,
    main_character: null,
    custom_color: null,
    verified_at: null,
    created_at: null,
    updated_at: null,
  };
}

function allProfiles() {
  const db = store.load();
  return Object.values(db.users || {});
}

function getProfile(guildId, discordId) {
  const db = store.load();
  return (
    db.users[keyFor(guildId, discordId)] ||
    db.users[keyFor("global", discordId)] ||
    null
  );
}

function findByRoblox(guildId, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  const list = allProfiles().filter((p) => !guildId || p.guild_id === guildId || !p.guild_id);
  return (
    list.find((p) => String(p.roblox_username || "").toLowerCase() === q) ||
    list.find((p) => String(p.roblox_display_name || "").toLowerCase() === q) ||
    list.find((p) => String(p.roblox_id || "") === q) ||
    list.find((p) => String(p.profile_id || "") === q)
  );
}

function saveProfile(guildId, discordId, updates) {
  let saved = null;
  store.updateSync((db) => {
    if (!db.users) db.users = {};
    if (!db.nextId) db.nextId = 100;
    const key = keyFor(guildId, discordId);
    const current = db.users[key] || emptyProfile(discordId, guildId);
    if (!current.profile_id) {
      current.profile_id = db.nextId;
      db.nextId += 1;
    }
    saved = {
      ...current,
      ...updates,
      discord_id: String(discordId),
      guild_id: guildId || current.guild_id,
      updated_at: new Date().toISOString(),
      created_at: current.created_at || new Date().toISOString(),
    };
    db.users[key] = saved;
    return db;
  });
  return saved;
}

function deleteProfile(guildId, discordId) {
  store.updateSync((db) => {
    delete db.users[keyFor(guildId, discordId)];
    return db;
  });
}

function publicProfile(profile) {
  if (!profile) return null;
  return {
    profileId: profile.profile_id,
    discordId: profile.discord_id,
    displayName: profile.display_name,
    robloxUsername: profile.roblox_username,
    robloxDisplayName: profile.roblox_display_name,
    robloxId: profile.roblox_id,
    avatarUrl: profile.roblox_avatar_url,
    region: profile.region,
    regionLabel: regionLabel(profile.region),
    country: profile.country,
    countryFlag: profile.country_flag,
    mainCharacter: getCharacterLabel(profile.main_character),
    verifiedAt: profile.verified_at,
  };
}

module.exports = {
  store,
  getProfile,
  findByRoblox,
  saveProfile,
  deleteProfile,
  allProfiles,
  emptyProfile,
  publicProfile,
  resolveRobloxUser,
  checkRobloxBio,
};
