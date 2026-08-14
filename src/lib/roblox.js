async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const raw = await res.text();
    const data = raw
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        })()
      : null;
    if (!res.ok) {
      const err = new Error(`Roblox request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobloxInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const idMatch = raw.match(/(?:www\.|web\.)?roblox\.com\/users\/(\d+)/i);
  if (idMatch) return { type: "id", value: idMatch[1] };
  const atMatch = raw.match(/(?:www\.|web\.)?roblox\.com\/@([\w.-]+)/i);
  if (atMatch) return { type: "username", value: atMatch[1] };
  if (/^\d{3,}$/.test(raw)) return { type: "id", value: raw };
  return { type: "username", value: raw.replace(/^@/, "") };
}

async function resolveRobloxUser(input) {
  const identifier = parseRobloxInput(input);
  if (!identifier) throw new Error("Enter a Roblox username or profile URL.");

  let user;
  if (identifier.type === "id") {
    user = await fetchJson(`https://users.roblox.com/v1/users/${encodeURIComponent(identifier.value)}`);
  } else {
    const search = await fetchJson("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      body: JSON.stringify({ usernames: [identifier.value], excludeBannedUsers: false }),
    });
    user = search?.data?.[0];
    if (!user) throw new Error(`Could not find Roblox user "${identifier.value}".`);
  }

  const avatarRes = await fetchJson(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(user.id)}&size=420x420&format=Png&isCircular=false`
  );

  return {
    id: String(user.id),
    name: user.name,
    displayName: user.displayName || user.name,
    avatarUrl: avatarRes?.data?.[0]?.imageUrl || null,
    description: user.description || "",
  };
}

async function checkRobloxBio(robloxId, code) {
  const user = await fetchJson(`https://users.roblox.com/v1/users/${encodeURIComponent(robloxId)}`);
  const bio = String(user?.description || "");
  return bio.toLowerCase().includes(String(code).toLowerCase());
}

module.exports = { parseRobloxInput, resolveRobloxUser, checkRobloxBio };
