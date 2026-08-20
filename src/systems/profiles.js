const { createJsonStore } = require("../store/jsonStore");
const { resolveRobloxUser, checkRobloxBio } = require("../lib/roblox");
const { getCharacterLabel } = require("../lib/characters");
const { regionLabel } = require("../lib/regions");

const store = createJsonStore("profiles.json", { nextId: 100, nextCodeIndex: 0, users: {} });

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BLOCKED = new Set([
  "ASS", "FUK", "FUC", "FAG", "NIG", "SEX", "TIT", "KKK", "CUM", "DIE", "GAY", "STD", "PUS",
]);

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

function isLetterCode(value) {
  return /^[A-Z]{3}$/.test(String(value || "").toUpperCase());
}

function indexToCode(n) {
  let x = Math.max(0, Number(n) || 0);
  let out = "";
  for (let i = 0; i < 3; i++) {
    out = LETTERS[x % 26] + out;
    x = Math.floor(x / 26);
  }
  return out;
}

function usedCodes(db) {
  const set = new Set();
  for (const p of Object.values(db.users || {})) {
    const c = String(p.profile_id || "").toUpperCase();
    if (isLetterCode(c)) set.add(c);
  }
  return set;
}

function nextCode(db) {
  const used = usedCodes(db);
  let i = Number(db.nextCodeIndex || 0);
  for (let n = 0; n < 26 ** 3 + 2; n++) {
    const code = indexToCode(i);
    i += 1;
    if (BLOCKED.has(code) || used.has(code)) continue;
    db.nextCodeIndex = i;
    return code;
  }
  throw new Error("No profile codes left.");
}

function ensureLetterCode(db, profile) {
  if (isLetterCode(profile.profile_id)) {
    profile.profile_id = String(profile.profile_id).toUpperCase();
    return profile.profile_id;
  }
  profile.profile_id = nextCode(db);
  return profile.profile_id;
}

function migrateCodes(db) {
  if (!db.users) db.users = {};
  if (db.nextCodeIndex == null) db.nextCodeIndex = 0;
  for (const profile of Object.values(db.users)) {
    ensureLetterCode(db, profile);
  }
  return db;
}

function needsMigrate(db) {
  for (const profile of Object.values(db.users || {})) {
    if (!isLetterCode(profile.profile_id)) return true;
  }
  return false;
}

function loadMigrated() {
  const db = store.load();
  if (!needsMigrate(db)) return db;
  return store.updateSync(migrateCodes);
}

function allProfiles() {
  return Object.values(loadMigrated().users || {});
}

function getProfile(guildId, discordId) {
  const db = loadMigrated();
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
  const code = q.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (
    (isLetterCode(code) && list.find((p) => String(p.profile_id || "").toUpperCase() === code)) ||
    list.find((p) => String(p.roblox_username || "").toLowerCase() === q) ||
    list.find((p) => String(p.roblox_display_name || "").toLowerCase() === q) ||
    list.find((p) => String(p.roblox_id || "") === q) ||
    list.find((p) => String(p.profile_id || "").toLowerCase() === q)
  );
}

function profilesForGuild(guildId) {
  return allProfiles().filter((p) => !guildId || p.guild_id === guildId || !p.guild_id);
}

function findDuplicateRoblox(guildId, robloxId, excludeDiscordId = null) {
  if (!robloxId) return [];
  const id = String(robloxId);
  const exclude = excludeDiscordId ? String(excludeDiscordId) : null;
  return profilesForGuild(guildId).filter(
    (p) => p.roblox_id && String(p.roblox_id) === id && String(p.discord_id) !== exclude
  );
}

function listDuplicateRobloxGroups(guildId) {
  const groups = new Map();
  for (const profile of profilesForGuild(guildId)) {
    if (!profile.roblox_id) continue;
    const key = String(profile.roblox_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(profile);
  }
  return [...groups.values()].filter((rows) => rows.length > 1);
}

function listNetworkDuplicateGroups() {
  const byRoblox = new Map();
  for (const profile of allProfiles()) {
    if (!profile.roblox_id) continue;
    const key = String(profile.roblox_id);
    if (!byRoblox.has(key)) byRoblox.set(key, new Map());
    const byDiscord = byRoblox.get(key);
    const discordId = String(profile.discord_id);
    if (!byDiscord.has(discordId)) byDiscord.set(discordId, []);
    byDiscord.get(discordId).push(profile);
  }
  const groups = [];
  for (const [robloxId, byDiscord] of byRoblox) {
    if (byDiscord.size < 2) continue;
    const accounts = [...byDiscord.entries()].map(([discordId, rows]) => ({
      discordId,
      displayName: rows[0].display_name,
      robloxUsername: rows[0].roblox_username,
      robloxId,
      profileId: rows[0].profile_id,
      guilds: [...new Set(rows.map((row) => row.guild_id).filter(Boolean))],
    }));
    groups.push({
      robloxId,
      robloxUsername: accounts[0].robloxUsername,
      accounts,
    });
  }
  return groups.sort((a, b) => b.accounts.length - a.accounts.length);
}

function saveProfile(guildId, discordId, updates) {
  const { skipBoardRefresh, ...patch } = updates || {};
  let saved = null;
  store.updateSync((db) => {
    migrateCodes(db);
    const key = keyFor(guildId, discordId);
    const current = db.users[key] || emptyProfile(discordId, guildId);
    ensureLetterCode(db, current);
    saved = {
      ...current,
      ...patch,
      profile_id: current.profile_id,
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
  findDuplicateRoblox,
  listDuplicateRobloxGroups,
  listNetworkDuplicateGroups,
  profilesForGuild,
  saveProfile,
  deleteProfile,
  allProfiles,
  emptyProfile,
  publicProfile,
  resolveRobloxUser,
  checkRobloxBio,
  isLetterCode,
};
