const brand = {
  name: process.env.BOT_NAME || "ASA",
  prefix: process.env.BOT_PREFIX || "'",
  color: parseInt(String(process.env.BOT_COLOR || "2B2D31"), 16) || 0x2b2d31,
  accent: 0x7c9cff,
  success: 0x57f287,
  warn: 0xfee75c,
  danger: 0xed4245,
  website: process.env.WEBSITE_URL || "http://localhost:5173",
  defaultGif:
    process.env.DEFAULT_CARD_GIF ||
    "https://developers.oneway.lat/evidencias/asa_3_1.gif",
  tagline: "TSB clan ops — profiles, boards, lineups, and an AI coach.",
};

function authorName(suffix = "TSB") {
  return `${brand.name} · ${suffix}`;
}

module.exports = { brand, authorName };
