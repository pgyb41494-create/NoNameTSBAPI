const bridge = require("../botBridge");

function notifyStaffAlert(guildId, event, payload = {}) {
  if (!guildId || !event) return;
  bridge.postStaffAlertBackground(guildId, event, payload);
}

module.exports = { notifyStaffAlert };
