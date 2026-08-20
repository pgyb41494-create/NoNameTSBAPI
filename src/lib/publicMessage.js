const { userAvatarFromDiscord, forceGifIfAnimated } = require("./discordUser");

function embedJson(embed) {
  try {
    if (typeof embed?.toJSON === "function") return embed.toJSON();
  } catch {
    /* fall through */
  }
  return {
    title: embed?.title || null,
    description: embed?.description || null,
    url: embed?.url || null,
    color: embed?.color ?? null,
    timestamp: embed?.timestamp || null,
    footer: embed?.footer
      ? { text: embed.footer.text || null, icon_url: embed.footer.iconURL || embed.footer.icon_url || null }
      : null,
    image: embed?.image?.url ? { url: embed.image.url } : null,
    thumbnail: embed?.thumbnail?.url ? { url: embed.thumbnail.url } : null,
    author: embed?.author
      ? {
          name: embed.author.name || null,
          url: embed.author.url || null,
          icon_url: embed.author.iconURL || embed.author.icon_url || null,
        }
      : null,
    fields: Array.isArray(embed?.fields)
      ? embed.fields.map((f) => ({
          name: f.name || "",
          value: f.value || "",
          inline: !!f.inline,
        }))
      : [],
  };
}

function resolveAvatar(message, size = 64) {
  const author = message?.author;
  try {
    if (message?.member?.displayAvatarURL) {
      return forceGifIfAnimated(
        message.member.displayAvatarURL({ size, forceStatic: false, extension: "png" })
      );
    }
  } catch {
    /* ignore */
  }
  try {
    if (author?.displayAvatarURL) {
      const hash = String(author.avatar || "");
      return forceGifIfAnimated(
        author.displayAvatarURL({
          size,
          forceStatic: false,
          extension: hash.startsWith("a_") ? "gif" : "png",
        })
      );
    }
  } catch {
    /* ignore */
  }
  return forceGifIfAnimated(userAvatarFromDiscord(author, size));
}

function publicMessage(message) {
  const author = message?.author;
  const webhookId = message?.webhookId ? String(message.webhookId) : null;
  const isWebhook = !!webhookId;
  const displayName = isWebhook
    ? author?.username || "Webhook"
    : message?.member?.displayName || author?.globalName || author?.username || "Unknown";

  return {
    id: String(message.id),
    content: message.content || "",
    createdAt: message.createdAt?.toISOString?.() || null,
    editedAt: message.editedAt?.toISOString?.() || null,
    type: Number(message.type ?? 0),
    system: !!message.system,
    webhookId,
    author: {
      id: String(author?.id || webhookId || ""),
      username: author?.username || "unknown",
      displayName,
      avatar: resolveAvatar(message, 64),
      bot: !!author?.bot || isWebhook,
      webhook: isWebhook,
    },
    embeds: [...(message.embeds || [])].slice(0, 10).map(embedJson),
    attachments: [...(message.attachments?.values?.() || message.attachments || [])].map((file) => ({
      id: String(file.id),
      name: file.name,
      url: file.url || file.proxyURL || null,
      proxyUrl: file.proxyURL || null,
      contentType: file.contentType || null,
      width: file.width || null,
      height: file.height || null,
      size: file.size || null,
    })),
    stickers: [...(message.stickers?.values?.() || [])].map((sticker) => ({
      id: String(sticker.id),
      name: sticker.name,
      url: sticker.url || `https://media.discordapp.net/stickers/${sticker.id}.png`,
      format: sticker.format || sticker.format_type || null,
    })),
    mentions: [...(message.mentions?.users?.values?.() || [])].map((user) => ({
      id: String(user.id),
      username: user.username,
      displayName: user.globalName || user.username,
    })),
    mentionRoles: [...(message.mentions?.roles?.values?.() || [])].map((role) => ({
      id: String(role.id),
      name: role.name,
    })),
    mentionChannels: [...(message.mentions?.channels?.values?.() || [])].map((ch) => ({
      id: String(ch.id),
      name: ch.name,
    })),
    repliedUser: message.mentions?.repliedUser
      ? {
          id: String(message.mentions.repliedUser.id),
          username: message.mentions.repliedUser.username,
          displayName:
            message.mentions.repliedUser.globalName || message.mentions.repliedUser.username,
        }
      : null,
    reference: message.reference?.messageId
      ? {
          messageId: String(message.reference.messageId),
          channelId: message.reference.channelId ? String(message.reference.channelId) : null,
        }
      : null,
  };
}

module.exports = { publicMessage, embedJson, resolveAvatar };
