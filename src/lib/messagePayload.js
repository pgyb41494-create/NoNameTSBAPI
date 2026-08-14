/**
 * Build a discord.js message payload from plain text and/or embed fields.
 */
function parseColor(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const hex = String(value).trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return parseInt(hex, 16);
}

function buildMessagePayload({ content, embed, embeds } = {}) {
  const text = content != null ? String(content).trim() : "";
  const payload = {};

  if (text) payload.content = text.slice(0, 2000);

  // Already-built Discord embeds (e.g. forwarded from API → bot HTTP)
  if (Array.isArray(embeds) && embeds.length) {
    payload.embeds = embeds.slice(0, 10);
  } else if (embed && typeof embed === "object") {
    const title = embed.title != null ? String(embed.title).trim() : "";
    const description = embed.description != null ? String(embed.description).trim() : "";
    const footer =
      typeof embed.footer === "object" && embed.footer?.text != null
        ? String(embed.footer.text).trim()
        : embed.footer != null
          ? String(embed.footer).trim()
          : "";
    const image =
      typeof embed.image === "object" && embed.image?.url != null
        ? String(embed.image.url).trim()
        : embed.image != null
          ? String(embed.image).trim()
          : "";
    const thumbnail =
      typeof embed.thumbnail === "object" && embed.thumbnail?.url != null
        ? String(embed.thumbnail.url).trim()
        : embed.thumbnail != null
          ? String(embed.thumbnail).trim()
          : "";
    const url = embed.url != null ? String(embed.url).trim() : "";
    const color = parseColor(embed.color);

    if (title || description || image || thumbnail) {
      const apiEmbed = {};
      if (title) apiEmbed.title = title.slice(0, 256);
      if (description) apiEmbed.description = description.slice(0, 4096);
      if (color != null) apiEmbed.color = color;
      if (footer) apiEmbed.footer = { text: footer.slice(0, 2048) };
      if (image) apiEmbed.image = { url: image };
      if (thumbnail) apiEmbed.thumbnail = { url: thumbnail };
      if (url) apiEmbed.url = url;
      payload.embeds = [apiEmbed];
    }
  }

  if (!payload.content && !payload.embeds?.length) {
    const err = new Error("Add message text and/or an embed (title or description).");
    err.status = 400;
    throw err;
  }

  return payload;
}

module.exports = { buildMessagePayload, parseColor };
