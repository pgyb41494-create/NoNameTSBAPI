async function postDiscordWebhook(url, body) {
  const raw = String(url || "").trim();
  if (!/^https:\/\/(canary\.|ptb\.)?(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(raw)) {
    const err = new Error("Invalid Discord webhook URL");
    err.status = 400;
    throw err;
  }
  const join = raw.includes("?") ? "&" : "?";
  const res = await fetch(`${raw}${join}wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Webhook failed (${res.status})`);
    err.status = 400;
    throw err;
  }
  return data;
}

module.exports = { postDiscordWebhook };
