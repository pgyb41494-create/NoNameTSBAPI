const bridge = require("../botBridge");

function notifyBoardRefresh(guildId, userId) {
  if (!guildId) return;
  bridge.refreshBoardsBackground(guildId, userId);
}

module.exports = { notifyBoardRefresh };
