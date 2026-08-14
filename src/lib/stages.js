const TIERS = ["0", "1", "2", "3", "4", "5"];
const BANDS = ["Low Weak", "High Weak", "Low Strong", "High Strong"];

function defaultStages() {
  const out = [];
  for (const tier of TIERS) {
    for (const band of BANDS) {
      out.push(`${tier} ${band}`);
    }
  }
  out.push("Applicant");
  return out;
}

function parseStage(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/applicant/i.test(raw)) return "Applicant";

  const cleaned = raw.replace(/st(age)?/gi, " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d)\s*(low|high)?\s*(weak|strong)?$/i);
  if (!match) return cleaned;

  const tier = match[1];
  const height = match[2] ? match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() : "Low";
  const power = match[3] ? match[3][0].toUpperCase() + match[3].slice(1).toLowerCase() : "Weak";
  return `${tier} ${height} ${power}`;
}

module.exports = { TIERS, BANDS, defaultStages, parseStage };
