const { brand } = require("../brand");

const KNOWLEDGE = {
  version: 1,
  game: "The Strongest Battlegrounds",
  notes:
    "Replace and expand this file with your own vod reviews, character routes, and clip timestamps. The coach injects this text as the system brief.",
  fundamentals: [
    "Keep M1 strings tight. Dropped M1s are the most common reason mid-tier players lose exchanges.",
    "Do not waste dash on approach if the opponent still has a punish tool. Side-dash after a read, not as a default.",
    "Block first when you do not have a confirmed read. Perfect block / well-timed block wins more sets than greedy counters.",
    "Track awakening. Dumping awake into a lost neutral is a throw. Save it for a confirmed kill or a comeback sequence.",
    "After a knockdown, take space or meaty — do not dash in raw if they have a wake-up option.",
    "Stamina / end-lag management: if a move is minus, stop mashing. Walk back and wait for the whiff.",
    "Do not spam the same starter. Mix M1, grab/throw pressure, and a delayed dash.",
    "When you win a stock, reset. Do not ego-dash into their awake.",
  ],
  vodChecklist: [
    "Did the player take first hit or lose neutral repeatedly?",
    "Are they mashing on block or after a missed skill?",
    "Is movement panicked (forward dash only) or purposeful (side / back / walk)?",
    "Are they using the character's actual combo route or random skills?",
    "Do they respect the opponent's plus frames?",
    "Do they chase kills that are not guaranteed?",
  ],
  outputFormat: [
    "Identity verdict (is this the linked Roblox user?)",
    "3–6 concrete mistakes timestamped if possible",
    "What to drill next session (short, specific)",
    "One thing they already do well",
  ],
};

function knowledgePrompt() {
  return [
    `You are ${brand.name} TSB AI Coach for The Strongest Battlegrounds on Roblox.`,
    "Be direct, specific, and useful. No hype filler.",
    "",
    "Fundamentals:",
    ...KNOWLEDGE.fundals.map((l) => `- ${l}`),
    "",
    "When reviewing a vod, check:",
    ...KNOWLEDGE.vodChecklist.map((l) => `- ${l}`),
    "",
    "Always answer with:",
    ...KNOWLEDGE.outputFormat.map((l) => `- ${l}`),
    "",
    KNOWLEDGE.notes,
  ].join("\n");
}

module.exports = { KNOWLEDGE, knowledgePrompt };
