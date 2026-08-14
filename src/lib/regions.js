const REGIONS = [
  { label: "Sao Paulo, Brazil", value: "sao_paulo", short: "SP" },
  { label: "Miami, Florida", value: "miami", short: "NAE" },
  { label: "Dallas, Texas", value: "dallas", short: "NA Central" },
  { label: "Los Angeles, California", value: "los_angeles", short: "NA West" },
  { label: "Virginia, USA", value: "virginia", short: "NA East" },
  { label: "Chicago, USA", value: "chicago", short: "NA Central" },
  { label: "Santiago, Chile", value: "santiago", short: "CL" },
  { label: "Buenos Aires, Argentina", value: "buenos_aires", short: "AR" },
  { label: "Lima, Peru", value: "lima", short: "PE" },
  { label: "Bogota, Colombia", value: "bogota", short: "CO" },
  { label: "Mexico City, Mexico", value: "mexico_city", short: "MX" },
  { label: "London, UK", value: "london", short: "EU West" },
  { label: "Frankfurt, Germany", value: "frankfurt", short: "EU" },
  { label: "Amsterdam, Netherlands", value: "amsterdam", short: "EU" },
  { label: "Paris, France", value: "paris", short: "EU" },
  { label: "Madrid, Spain", value: "madrid", short: "EU" },
  { label: "Warsaw, Poland", value: "warsaw", short: "EU East" },
  { label: "Tokyo, Japan", value: "tokyo", short: "AS" },
  { label: "Seoul, South Korea", value: "seoul", short: "KR" },
  { label: "Singapore", value: "singapore", short: "SEA" },
  { label: "Sydney, Australia", value: "sydney", short: "OCE" },
  { label: "Mumbai, India", value: "mumbai", short: "IN" },
  { label: "Dubai, UAE", value: "dubai", short: "ME" },
  { label: "Johannesburg, South Africa", value: "johannesburg", short: "ZA" },
];

const LINEUP_REGIONS = [
  { key: "na", label: "NA" },
  { key: "east", label: "East" },
  { key: "west", label: "West" },
  { key: "central", label: "Central" },
  { key: "eu", label: "EU" },
  { key: "asia", label: "Asia" },
  { key: "sa", label: "SA" },
  { key: "oce", label: "OCE" },
];

function regionLabel(value) {
  if (!value) return "—";
  return REGIONS.find((r) => r.value === value)?.label || value;
}

function regionShort(value) {
  if (!value) return "—";
  const hit = REGIONS.find((r) => r.value === value);
  return hit?.short || hit?.label || value;
}

module.exports = { REGIONS, LINEUP_REGIONS, regionLabel, regionShort };
