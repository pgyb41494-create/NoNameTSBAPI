const CHARACTERS = [
  "Saitama",
  "Garou",
  "Genos",
  "Sonic",
  "Tatsumaki",
  "Atomic",
  "Metal Bat",
  "Child Emperor",
  "Suiryu",
  "Blizzard",
  "Mumen Rider",
  "Tech",
];

function getCharacterLabel(value) {
  if (!value) return "—";
  const hit = CHARACTERS.find((c) => c.toLowerCase() === String(value).toLowerCase());
  return hit || value;
}

module.exports = { CHARACTERS, getCharacterLabel };
