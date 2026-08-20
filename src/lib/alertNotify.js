const bridge = require("../botBridge");
const activity = require("../systems/activity");

function notifyStaffAlert(guildId, event, payload = {}) {
  if (!guildId || !event) return;
  try {
    activity.record(guildId, event, payload);
  } catch (err) {
    console.error("[activity] failed to record", err.message);
  }
  bridge.postStaffAlertBackground(guildId, event, payload);
}

module.exports = { notifyStaffAlert };
