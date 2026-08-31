const CHARACTERS = [
  "The Strongest Hero",
  "Hero Hunter",
  "Destructive Cyborg",
  "Deadly Ninja",
  "Brutal Demon",
  "Blade Master",
  "Wild Psychic",
  "Martial Artist",
  "Tech Prodigy",
  "Undying Hero",
  "KJ",
  "Sorcerer",
  "The Frozen Soul",
  "Crab Boss",
];

const LEGACY_CHARACTER_NAMES = {
  saitama: "The Strongest Hero",
  garou: "Hero Hunter",
  genos: "Destructive Cyborg",
  sonic: "Deadly Ninja",
  tatsumaki: "Wild Psychic",
  atomic: "Blade Master",
  "atomic samurai": "Blade Master",
  "metal bat": "Brutal Demon",
  "child emperor": "Tech Prodigy",
  suiryu: "Martial Artist",
  tech: "Tech Prodigy",
};

function getCharacterLabel(value) {
  if (!value) return "—";
  const normalized = String(value).trim().toLowerCase();
  const legacy = LEGACY_CHARACTER_NAMES[normalized];
  if (legacy) return legacy;
  return CHARACTERS.find((c) => c.toLowerCase() === normalized) || value;
}

module.exports = { CHARACTERS, LEGACY_CHARACTER_NAMES, getCharacterLabel };
