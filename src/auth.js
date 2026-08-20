const crypto = require("crypto");

const OWNER_IDS = ["1515419032520626261", "1196512159266504797"];

const STAFF_IDS = new Set([
  ...OWNER_IDS,
  ...String(process.env.STAFF_DISCORD_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
]);

const DEFAULT_SITE = "https://no-name-tsb-website.vercel.app";

function secret() {
  return process.env.SESSION_SECRET || process.env.API_TOKEN || "ascendant-staff-session";
}

function websiteUrl() {
  let url = (process.env.WEBSITE_URL || process.env.FRONTEND_URL || DEFAULT_SITE).replace(/\/$/, "");
  // Never bounce production OAuth back to localhost
  if (
    (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN || process.env.NODE_ENV === "production") &&
    /localhost|127\.0\.0\.1/i.test(url)
  ) {
    return DEFAULT_SITE;
  }
  return url || DEFAULT_SITE;
}

function apiPublicUrl() {
  if (process.env.API_PUBLIC_URL) {
    return process.env.API_PUBLIC_URL.replace(/\/$/, "");
  }
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  if (railway) {
    const host = String(railway).replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return `http://localhost:${process.env.PORT || process.env.API_PORT || 8787}`;
}

function redirectUri() {
  return process.env.DISCORD_REDIRECT_URI || `${apiPublicUrl()}/auth/discord/callback`;
}

function clientId() {
  return process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || "";
}

function isStaff(id) {
  return STAFF_IDS.has(String(id));
}

function isOwner(id) {
  return OWNER_IDS.includes(String(id));
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const header = String(req.headers.cookie || "");
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

function cookieHeader(token) {
  const secure = websiteUrl().startsWith("https") || apiPublicUrl().startsWith("https");
  return [
    `asc_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    secure ? "SameSite=None" : "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 7}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function clearCookieHeader() {
  const secure = websiteUrl().startsWith("https") || apiPublicUrl().startsWith("https");
  const base = secure
    ? "Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0"
    : "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  return [`asc_session=; ${base}`, `asc_staff=; ${base}`];
}

function bearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function readSession(req) {
  return (
    verify(bearerToken(req)) ||
    verify(readCookie(req, "asc_session")) ||
    verify(readCookie(req, "asc_staff"))
  );
}

function publicUser(session) {
  if (!session) return null;
  return {
    id: session.id,
    username: session.username,
    avatar: session.avatar,
    staff: isStaff(session.id),
    owner: isOwner(session.id),
  };
}

function discordAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "identify guilds",
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || data?.error || "Discord token exchange failed");
  return data;
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Could not load Discord user");
  return data;
}

function mountAuth(app) {
  app.get("/auth/discord", (_req, res) => {
    if (!clientId()) {
      return res.status(500).send("DISCORD_CLIENT_ID is not set.");
    }
    res.redirect(discordAuthorizeUrl());
  });

  app.get("/auth/discord/callback", async (req, res) => {
    const site = websiteUrl();
    try {
      const code = req.query.code;
      if (!code) return res.redirect(`${site}/?login=denied`);
      const tokens = await exchangeCode(String(code));
      const user = await fetchDiscordUser(tokens.access_token);
      const token = sign({
        id: String(user.id),
        username: user.global_name || user.username,
        handle: user.username,
        avatar: (() => {
          const { discordAvatarUrl } = require("./lib/discordUser");
          return discordAvatarUrl(user.id, user.avatar, 128);
        })(),
        discordAccess: tokens.access_token || "",
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      res.setHeader("Set-Cookie", cookieHeader(token));
      // Obscura-style: hand the session to the homepage via URL (cookies fail cross-site)
      return res.redirect(`${site}/?login=ok&auth_token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error("Discord login failed:", err.message);
      return res.redirect(`${site}/?login=error`);
    }
  });

  app.get("/auth/me", (req, res) => {
    const user = readSession(req);
    if (!user) return res.status(401).json({ user: null });
    res.json({ user: publicUser(user) });
  });

  app.post("/auth/logout", (_req, res) => {
    res.setHeader("Set-Cookie", clearCookieHeader());
    res.json({ ok: true });
  });
}

module.exports = {
  mountAuth,
  readSession,
  isStaff,
  isOwner,
  publicUser,
  websiteUrl,
  clientId,
  OWNER_IDS,
  STAFF_IDS,
};
