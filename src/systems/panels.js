const { createJsonStore } = require("../store/jsonStore");

const store = createJsonStore("panels.json", {});
const ROLE_MODES = new Set(["toggle", "add", "remove", "exclusive"]);

function sanitizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function emptyGuild() {
  return { panels: {}, panelAliases: {} };
}

function getGuild(guildId) {
  const db = store.load();
  const current = db[String(guildId)] || {};
  return {
    ...emptyGuild(),
    ...current,
    panels: { ...(current.panels || {}) },
    panelAliases: { ...(current.panelAliases || {}) },
  };
}

function saveGuild(guildId, cfg) {
  store.updateSync((db) => {
    db[String(guildId)] = cfg;
    return db;
  });
  return cfg;
}

function resolvePanelKey(cfg, panelKey) {
  if (!cfg || !panelKey) return sanitizeKey(panelKey);
  const rawKey = String(panelKey);
  if (cfg.panels?.[rawKey]) return rawKey;
  const sanitizedKey = sanitizeKey(rawKey);
  if (cfg.panels?.[sanitizedKey]) return sanitizedKey;
  const normalizedRaw = rawKey.replace(/[_-]/g, "").toLowerCase();
  const fuzzy = Object.keys(cfg.panels || {}).find((k) => {
    const stored = sanitizeKey(k).replace(/[_-]/g, "").toLowerCase();
    return (
      sanitizeKey(k) === sanitizedKey ||
      String(k).toLowerCase() === rawKey.toLowerCase() ||
      stored === normalizedRaw
    );
  });
  if (fuzzy) return fuzzy;
  const aliases = cfg.panelAliases || {};
  if (aliases[rawKey]) return resolvePanelKey(cfg, aliases[rawKey]);
  if (aliases[sanitizedKey]) return resolvePanelKey(cfg, aliases[sanitizedKey]);
  const aliasMatch = Object.entries(aliases).find(([alias, target]) => {
    const normalizedAlias = sanitizeKey(alias).replace(/[_-]/g, "").toLowerCase();
    const normalizedTarget = sanitizeKey(target).replace(/[_-]/g, "").toLowerCase();
    return (
      sanitizeKey(alias) === sanitizedKey ||
      sanitizeKey(target) === sanitizedKey ||
      String(alias).toLowerCase() === rawKey.toLowerCase() ||
      String(target).toLowerCase() === rawKey.toLowerCase() ||
      normalizedAlias === normalizedRaw ||
      normalizedTarget === normalizedRaw
    );
  });
  if (aliasMatch) return resolvePanelKey(cfg, aliasMatch[1]);
  return sanitizedKey;
}

function normalizePanelButton(btn = {}) {
  const action = btn.action || (btn.url ? "url" : "role");
  const styleRaw = String(btn.style || (action === "url" ? "LINK" : "PRIMARY")).toUpperCase();
  const style = action === "url" ? "LINK" : styleRaw;
  const roleMode = ROLE_MODES.has(btn.roleMode) ? btn.roleMode : "toggle";
  const out = {
    label: String(btn.label || "Button").slice(0, 80),
    style,
    action,
    emoji: btn.emoji ? String(btn.emoji).trim() : "",
    roleMode,
    roleIds: Array.isArray(btn.roleIds) ? btn.roleIds.map(String) : btn.roleId ? [String(btn.roleId)] : [],
    removeRoleIds: Array.isArray(btn.removeRoleIds)
      ? btn.removeRoleIds.map(String)
      : btn.removeRoleId
        ? [String(btn.removeRoleId)]
        : [],
    url: btn.url ? String(btn.url).trim() : "",
    reply: btn.reply ? String(btn.reply) : "",
  };
  return out;
}

function normalizePanel(body = {}, existing = {}) {
  return {
    title: body.title != null ? String(body.title) : existing.title || "",
    description: body.description != null ? String(body.description) : existing.description || "",
    color: body.color != null ? String(body.color) : existing.color || "#5865F2",
    thumbnail: body.thumbnail != null ? String(body.thumbnail) : existing.thumbnail || "",
    image: body.image != null ? String(body.image) : existing.image || "",
    footer: body.footer != null ? String(body.footer) : existing.footer || "",
    buttons: Array.isArray(body.buttons)
      ? body.buttons.slice(0, 25).map(normalizePanelButton)
      : Array.isArray(existing.buttons)
        ? existing.buttons
        : [],
  };
}

function discordButtonStyle(style, action) {
  if (action === "url") return 5;
  const map = { PRIMARY: 1, SECONDARY: 2, SUCCESS: 3, DANGER: 4, LINK: 5 };
  return map[String(style || "PRIMARY").toUpperCase()] || 1;
}

function parseEmoji(raw) {
  const e = String(raw || "").trim();
  if (!e) return null;
  const custom = e.match(/^<(a?):(\w+):(\d+)>$/);
  if (custom) return { animated: Boolean(custom[1]), name: custom[2], id: custom[3] };
  return { name: e };
}

function list(guildId) {
  const cfg = getGuild(guildId);
  return Object.entries(cfg.panels).map(([key, panel]) => ({ ...panel, key }));
}

function map(guildId) {
  return getGuild(guildId).panels;
}

function get(guildId, panelKey) {
  const cfg = getGuild(guildId);
  const key = resolvePanelKey(cfg, panelKey);
  const panel = cfg.panels[key];
  if (!panel) return null;
  return { key, ...panel };
}

function create(guildId, body = {}) {
  const rawKey = String(body.key || body.name || body.title || "");
  const key = rawKey ? sanitizeKey(rawKey) : `panel-${Date.now()}`;
  const cfg = getGuild(guildId);
  if (cfg.panels[key]) {
    const err = new Error("Panel key already exists");
    err.status = 400;
    throw err;
  }
  cfg.panels[key] = normalizePanel(body);
  saveGuild(guildId, cfg);
  return { key, ...cfg.panels[key] };
}

function update(guildId, panelKey, patch = {}) {
  const cfg = getGuild(guildId);
  const resolvedKey = resolvePanelKey(cfg, panelKey);
  if (!cfg.panels[resolvedKey]) {
    const err = new Error("Panel not found");
    err.status = 404;
    throw err;
  }
  const next = normalizePanel({ ...cfg.panels[resolvedKey], ...patch, buttons: patch.buttons }, cfg.panels[resolvedKey]);
  const rawNewKey = patch.key;
  const newKey = rawNewKey ? sanitizeKey(rawNewKey) : resolvedKey;
  if (newKey !== resolvedKey) {
    if (cfg.panels[newKey]) {
      const err = new Error("Panel key already exists");
      err.status = 400;
      throw err;
    }
    cfg.panels[newKey] = next;
    delete cfg.panels[resolvedKey];
    cfg.panelAliases[resolvedKey] = newKey;
    for (const alias of Object.keys(cfg.panelAliases)) {
      if (cfg.panelAliases[alias] === resolvedKey) cfg.panelAliases[alias] = newKey;
    }
    saveGuild(guildId, cfg);
    return { key: newKey, ...cfg.panels[newKey] };
  }
  cfg.panels[resolvedKey] = next;
  saveGuild(guildId, cfg);
  return { key: resolvedKey, ...cfg.panels[resolvedKey] };
}

function remove(guildId, panelKey) {
  const cfg = getGuild(guildId);
  const resolvedKey = resolvePanelKey(cfg, panelKey);
  if (!cfg.panels[resolvedKey]) {
    const err = new Error("Panel not found");
    err.status = 404;
    throw err;
  }
  delete cfg.panels[resolvedKey];
  saveGuild(guildId, cfg);
  return { ok: true };
}

function parseColor(value) {
  if (value == null || value === "") return 0x5865f2;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const hex = String(value).trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return 0x5865f2;
  return parseInt(hex, 16);
}

function buildDiscordPayload(guildId, panel, key) {
  const resolvedKey = key || panel.key;
  const embed = { color: parseColor(panel.color) };
  if (String(panel.title || "").trim()) embed.title = String(panel.title).trim().slice(0, 256);
  if (String(panel.description || "").trim()) embed.description = String(panel.description).trim().slice(0, 4096);
  if (String(panel.thumbnail || "").trim()) embed.thumbnail = { url: String(panel.thumbnail).trim() };
  if (String(panel.image || "").trim()) embed.image = { url: String(panel.image).trim() };
  if (String(panel.footer || "").trim()) embed.footer = { text: String(panel.footer).trim().slice(0, 2048) };
  if (!embed.title && !embed.description && !embed.image && !embed.thumbnail) {
    embed.description = "\u200b";
  }

  const buttons = Array.isArray(panel.buttons) ? panel.buttons : [];
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const slice = buttons.slice(i, i + 5);
    const comps = slice.map((btn, idx) => {
      const action = btn.action || (btn.url ? "url" : "role");
      const isLink = action === "url" || discordButtonStyle(btn.style, action) === 5;
      const b = {
        type: 2,
        label: String(btn.label || "Button").slice(0, 80),
        style: isLink ? 5 : discordButtonStyle(btn.style, action),
      };
      if (isLink) {
        b.url = String(btn.url || "https://example.com").trim() || "https://example.com";
      } else {
        b.custom_id = `panel_btn_${guildId}_${resolvedKey}_${i + idx}`;
      }
      const emoji = parseEmoji(btn.emoji);
      if (emoji) b.emoji = emoji;
      return b;
    });
    rows.push({ type: 1, components: comps });
  }

  return { embeds: [embed], components: rows };
}

module.exports = {
  sanitizeKey,
  resolvePanelKey,
  normalizePanelButton,
  list,
  map,
  get,
  create,
  update,
  remove,
  buildDiscordPayload,
};
