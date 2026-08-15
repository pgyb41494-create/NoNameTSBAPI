const HEIGHTS = ["Low", "Mid", "High"];
const POWERS = ["Weak", "Stable", "Strong"];
const TIERS = ["0", "1", "2", "3", "4", "5"];

/** All Phase × Tier × Sub-tier labels, e.g. "2 High Weak" */
function defaultBands() {
  const bands = [];
  for (const h of HEIGHTS) {
    for (const p of POWERS) bands.push(`${h} ${p}`);
  }
  return bands;
}

const BANDS = defaultBands();

function defaultStages() {
  const out = [];
  for (const tier of TIERS) {
    for (const band of BANDS) out.push(`${tier} ${band}`);
  }
  out.push("Applicant");
  return out;
}

/**
 * Accepts: "2 high weak", "phase 2 mid stable", "Stage 1 Low Strong", "applicant"
 */
function parseStage(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/applicant/i.test(raw)) return "Applicant";

  const cleaned = raw
    .replace(/ph(ase)?/gi, " ")
    .replace(/st(age)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = cleaned.match(/^(\d)\s*(low|mid|high)?\s*(weak|stable|strong)?$/i);
  if (!match) return cleaned;

  const tier = match[1];
  const height = match[2]
    ? match[2][0].toUpperCase() + match[2].slice(1).toLowerCase()
    : "Mid";
  const power = match[3]
    ? match[3][0].toUpperCase() + match[3].slice(1).toLowerCase()
    : "Stable";
  return `${tier} ${height} ${power}`;
}

/** Tryouter assignable cap: own phase, but never above 2 High Strong if they are higher. */
function tryoutAssignCap(tryouterStage) {
  const parsed = parseStage(tryouterStage);
  if (!parsed || parsed === "Applicant") return "2 High Strong";
  const m = parsed.match(/^(\d)\s+(Low|Mid|High)\s+(Weak|Stable|Strong)$/);
  if (!m) return "2 High Strong";
  const tier = Number(m[1]);
  if (tier > 2) return "2 High Strong";
  if (tier === 2 && m[2] === "High" && m[3] === "Strong") return "2 High Strong";
  if (tier === 2 && (m[2] === "High" || (m[2] === "Mid" && m[3] !== "Weak"))) {
    // still within 2.x — return their own stage as max
    return parsed;
  }
  return parsed;
}

function stageRankValue(stage) {
  const parsed = parseStage(stage);
  if (!parsed || parsed === "Applicant") return -1;
  const m = parsed.match(/^(\d)\s+(Low|Mid|High)\s+(Weak|Stable|Strong)$/);
  if (!m) return -1;
  const tier = Number(m[1]);
  const height = { Low: 0, Mid: 1, High: 2 }[m[2]] ?? 1;
  const power = { Weak: 0, Stable: 1, Strong: 2 }[m[3]] ?? 1;
  // Lower phase number is stronger (0 best). Invert for comparisons.
  return (5 - tier) * 9 + height * 3 + power;
}

function isStageAtMost(candidate, cap) {
  return stageRankValue(candidate) <= stageRankValue(cap);
}

module.exports = {
  TIERS,
  HEIGHTS,
  POWERS,
  BANDS,
  defaultStages,
  parseStage,
  tryoutAssignCap,
  stageRankValue,
  isStageAtMost,
};
