const { brand } = require("../brand");
const { tsblPromptBlock } = require("./tsblRules");

/**
 * Coach “training” = this brief (not fine-tuning).
 * Source clips / pro vods + TSBL competitive rules folded in.
 */
const KNOWLEDGE = {
  version: 6,
  game: "The Strongest Battlegrounds",
  notes:
    "You review player clips using screenshots/frames. Read the HUD and nametag. UI may be English OR Spanish. Apply TSBL competitive rules when the clip looks like a ranked/tryout/1v1. Be specific about what you see.",
  referenceVods: [
    {
      id: "pcBVerfhZ6c",
      url: "https://www.youtube.com/watch?v=pcBVerfhZ6c",
      about: "Pro FT10: XC (SG) vs Radiohead (KR) for top 1 Asia — region servers matter.",
    },
    {
      id: "aVdOt8yDyf0",
      url: "https://www.youtube.com/watch?v=aVdOt8yDyf0",
      about: "Edited TSB gameplay montage — flashy vs winning habits.",
    },
    {
      id: "TevMi7F-zO8",
      url: "https://www.youtube.com/watch?v=TevMi7F-zO8",
      about: "Clan stage voice — striping / running from pressure.",
    },
  ],
  /** Lessons distilled from watched gameplay clips (frames + vision model). */
  studiedClips: [
    {
      id: "roblox-2026-06-09",
      summary:
        "Saitama vs Saitama (~13s, Spanish HUD). axz_dai tracks abuela_2069 dash escape, M1 string into Golpes sucesivos kill while holding full Modo Serio.",
      lessons: [
        "Predictive dash-catch: cut off lateral/backdash escape angles — don't only chase their trail.",
        "Saitama kill confirm: tight 4-hit M1 string → Golpes sucesivos (Consecutive Punches) while they are still in hitstun.",
        "Do not pop Modo Serio / Serious Mode [G] when the opponent is already low and locked in an M1 confirm — save awake for the next stock.",
        "Low-HP dash spam in open space without blocking or counterdashing loses the round; retreat toward structures to break tracking.",
        "Spanish Saitama kit labels: 1 Puñetazo normal, 2 Golpes sucesivos, 3 Empujar, 4 Corte superior — use these names when HUD is ES.",
        "Keep M1 click timing tight so there are no gaps for side-dash escape mid-string.",
      ],
    },
    {
      id: "medal-2026-08-11",
      summary:
        "~21m Medal VOD (sampled). English HUD private-server sets vs Shycray_DAT: Saitama Shove/M1/downslam into Garou RAMPAGE, Lethal Whirlwind Stream confirm.",
      lessons: [
        "Saitama: cancel 3rd M1 into Shove (Empujar) to extend / break before 4th-M1 knockback ends the string.",
        "After a jump-M1 downslam knockdown, activate Serious Mode or Garou Rampage on get-up to deny free escape.",
        "Garou Rampage kit labels (EN): Flowing Water, Lethal Whirlwind Stream, Hunter's Grasp, Prey's Peril.",
        "Rampage: forward-dash immediately after awaken to stay glued, then Lethal Whirlwind Stream while they are recovering.",
        "Angle camera slightly down on the last M1 of a string to land consistent downslams.",
        "If opponent already spent ragdoll/evasive, commit multi-hit enders (Consecutive Punches / Lethal Whirlwind) instead of soft pressure.",
      ],
    },
  ],
  visionCues: [
    "Confirm identity from the nametag above the character (Roblox username), not only Discord.",
    "Top-right green bar = own health. Opponent health is the bar above their nametag.",
    "Bottom skill bar: slots 1–4 are the character kit. Spanish labels examples: Puñetazo normal, Golpes sucesivos, Empujar, Corte superior.",
    "MODO SERIO / Serious Mode meter with [G] = awakening / ultimate resource — call out dumping it badly.",
    "Knockdown / ragdoll on the ground = pressure or reset opportunity; note if they dash in raw.",
    "Red ground FX / hit VFX means an exchange just happened — judge who won the trade.",
    "Watch for illegal running (long side-dash retreats) and passive stalling between engages.",
    "If the nametag does not match the linked profile username, set verified=false.",
  ],
  fundamentals: [
    "Keep M1 strings tight. Dropped M1s are the most common reason mid-tier players lose exchanges.",
    "Do not waste dash on approach if the opponent still has a punish tool. Side-dash after a read, not as a default.",
    "Block first when you do not have a confirmed read. Perfect block / well-timed block wins more sets than greedy counters.",
    "Track awakening / Serious Mode. Dumping awake into a lost neutral is a throw. Save it for a confirmed kill or comeback.",
    "If opponent is already low and confirmed in an M1 string, finish with kit (e.g. Golpes sucesivos) — do not ego-pop awake.",
    "After a knockdown, take space or meaty — do not dash in raw if they have a wake-up option. If you have awake ready, activating on get-up is often stronger than giving free reset space.",
    "Stamina / end-lag management: if a move is minus, stop mashing. Walk back and wait for the whiff.",
    "Do not spam the same starter. Mix M1, grab/throw pressure, and a delayed dash.",
    "When you win a stock, reset. Do not ego-dash into their awake.",
    "Convert confirms into real damage. Pros finish routes; randoms dash away and lose advantage.",
    "When chasing a runner: predict their next dash destination and cut the angle instead of trailing behind.",
  ],
  characterRoutes: [
    "Saitama (The Strongest Hero): common confirms are M1 → Golpes sucesivos / Consecutive Punches, or M1 → Shove (Empujar) extension before 4th-M1 knockback. Uppercut / Corte superior is mix / anti-air — don't random mid-confirm.",
    "Garou (Hero Hunter) Rampage: after knockdown awaken, dash-catch then Lethal Whirlwind Stream while they recover. Track Flowing Water / Hunter's Grasp / Prey's Peril usage.",
    "Metal Bat (Brutal Demon): still judge the same fundamentals (neutral, dash discipline, awake value) even when kit names differ.",
  ],
  proLessons: [
    "Long sets (FT10+): stabilize after a lost game — one ego round should not tilt the whole set.",
    "Region / ping: expect to lose more on the opponent's server; still farm points there.",
    "Do not only play flashy. Montage movement that never converts is worse than ugly winning habits.",
    "Running from pressure / striping to avoid a fight = free coach callout.",
    "On stage / clan ranked: respect the format. Mic drama doesn't win stocks — execution does.",
    "If you're ahead in the set, play cleaner neutral — don't gift comeback awake.",
    "Watch who takes first hit repeatedly. High-level sets are often decided by opening neutral.",
  ],
  vodChecklist: [
    "Did the player take first hit or lose neutral repeatedly?",
    "Are they mashing on block or after a missed skill?",
    "Is movement panicked (forward dash only) or purposeful (side / back / walk)?",
    "Are they using the character's actual combo route or random skills?",
    "Do they respect the opponent's plus frames?",
    "Do they chase kills that are not guaranteed?",
    "Is Serious Mode / awake spent productively (or wasted when a kit confirm already kills)?",
    "Are they running from pressure / striping instead of fighting (4s+ / spam side-dash away)?",
    "Passive for 12s+ without aggressive dash?",
    "Do they tilt after losing a round?",
    "Legal character for competitive (Saitama / Garou / Metal Bat) if this looks ranked?",
  ],
  outputFormat: [
    "First line MUST be exactly: verified=true  OR  verified=false",
    "If verified=false: say why (wrong nametag / can't see name / wrong avatar) and stop — no full coach review.",
    "If verified=true: 3–6 concrete mistakes (mention what you saw on screen)",
    "Call out TSBL rule breaks if visible (running, passive, illegal macros/tech)",
    "What to drill next session (short, specific)",
    "One thing they already do well",
  ],
};

function knowledgePrompt() {
  const clipLessons = KNOWLEDGE.studiedClips.flatMap((c) =>
    c.lessons.map((l) => `- [${c.id}] ${l}`)
  );
  return [
    `You are ${brand.name} TSB AI Coach for The Strongest Battlegrounds on Roblox.`,
    "Be direct, specific, and useful. No hype filler.",
    "",
    "How to read the clip / frames:",
    ...KNOWLEDGE.visionCues.map((l) => `- ${l}`),
    "",
    "Fundamentals:",
    ...KNOWLEDGE.fundamentals.map((l) => `- ${l}`),
    "",
    "Character routes:",
    ...KNOWLEDGE.characterRoutes.map((l) => `- ${l}`),
    "",
    "Lessons from studied gameplay clips:",
    ...clipLessons,
    "",
    "Pro / stage lessons:",
    ...KNOWLEDGE.proLessons.map((l) => `- ${l}`),
    "",
    tsblPromptBlock(),
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
