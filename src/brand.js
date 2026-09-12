const site = String(process.env.WEBSITE_URL || "https://no-name-tsb-website.vercel.app").replace(/\/$/, "");

const brand = {
  name: process.env.BOT_NAME || "Ascendant",
  prefix: process.env.BOT_PREFIX || "'",
  color: parseInt(String(process.env.BOT_COLOR || "2B2D31"), 16) || 0x2b2d31,
  accent: 0x7c9cff,
  success: 0x57f287,
  warn: 0xfee75c,
  danger: 0xed4245,
  website: site,
  thumbnail: process.env.BOT_THUMBNAIL || `${site}/icon.jpg`,
  banner: process.env.BOT_BANNER || `${site}/bg-home.png`,
  defaultGif:
    process.env.DEFAULT_CARD_GIF ||
    "https://developers.oneway.lat/evidencias/asa_3_1.gif",
  tagline: "TSB clan ops — profiles, boards, lineups, and an AI coach.",
};

function authorName(suffix = "TSB") {
  return `${brand.name} · ${suffix}`;
}

module.exports = { brand, authorName };
