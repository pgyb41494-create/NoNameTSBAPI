const bridge = require("../botBridge");

async function fetchUsersMap(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const map = new Map();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const user = await bridge.fetchUser(id);
        if (user?.id) map.set(String(user.id), user);
      } catch {
        // keep stored snapshot fields when Discord is unreachable
      }
    })
  );
  return map;
}

function pickUser(map, id, fallback = {}) {
  const { forceGifIfAnimated } = require("./discordUser");
  const live = id ? map.get(String(id)) : null;
  return {
    username: live?.username || fallback.username || null,
    displayName: live?.displayName || fallback.displayName || live?.username || fallback.username || null,
    avatar: forceGifIfAnimated(live?.avatar || fallback.avatar || null),
    avatarHash: live?.avatarHash || fallback.avatarHash || null,
  };
}

async function enrichBlacklistRows(rows) {
  const map = await fetchUsersMap(
    (rows || []).flatMap((row) => [row.discordId, row.addedBy, row.moderatorId])
  );
  return (rows || []).map((row) => {
    const player = pickUser(map, row.discordId, row);
    const mod = pickUser(map, row.addedBy || row.moderatorId, {
      username: row.moderatorUsername || row.moderatorName,
      displayName: row.moderatorName,
      avatar: row.moderatorAvatar,
    });
    return {
      ...row,
      username: player.username,
      displayName: player.displayName,
      avatar: player.avatar,
      moderatorUsername: mod.username,
      moderatorName: mod.displayName || mod.username,
      moderatorAvatar: mod.avatar,
    };
  });
}

async function enrichTrainerRows(rows) {
  const map = await fetchUsersMap((rows || []).map((row) => row.discordId));
  return (rows || []).map((row) => {
    const player = pickUser(map, row.discordId, row);
    return {
      ...row,
      username: player.username,
      displayName: player.displayName,
      avatar: player.avatar,
    };
  });
}

async function enrichNetworkPublic(base) {
  const [blacklist, trainers] = await Promise.all([
    enrichBlacklistRows(base.blacklist || []),
    enrichTrainerRows(base.trainers || []),
  ]);
  return { ...base, blacklist, trainers };
}

module.exports = { enrichBlacklistRows, enrichTrainerRows, enrichNetworkPublic, fetchUsersMap };
