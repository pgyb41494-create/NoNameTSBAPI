/**
 * TSBL / LATAM TSB Competitive rules brief for the AI coach.
 * Sourced from league embeds (leaderboard, 1v1 rules, tryouts, phases).
 */
const TSBL = {
  name: "TSBL (LATAM TSB Competitive)",
  leaderboard: [
    "To get a leaderboard spot you need the tryout role (P1 tryout). That role lets you challenge Top 30.",
    "Challenge cooldown after a set: loser waits 7 days to challenge again; winner waits 4 days to accept another challenge. Both players may waive cooldown by agreement.",
    "Challenge range by rank: #30–#21 → within 3 spots; #20–#11 → within 2; #10–#1 → within 1.",
    "Allowed 1v1 formats: FT5 / FT10 standard; FT5 cross-region; FT5 / 2 sets.",
  ],
  fairPlay: [
    "Only Roblox-authorized FFlags from the allowed list. Bypassing client security for banned FFlags = match void.",
    "FPS unlock past Roblox cap (240) is banned. Physics / MTU / unauthorized texture mods (all black/white maps) banned.",
    "Native Bloxstrap settings that the client allows (e.g. lower textures) are OK. Fishtrap / Voidstrap / modified Bloxstrap forks banned.",
    "Lagswitch and tab-glitch style connection abuse banned in 1v1 / glads.",
    "Macros: ONLY backdash cancel / insta ragdoll style comfort macros allowed. Banned: ABA Tech, Hybrid Forward Dash (side+front), camera macros for lethal tech / Lee twisted / similar.",
    "Scripts / exploiting = permanent competitive ban.",
  ],
  matchConduct: [
    "Passive Strike: >12 seconds without an aggressive dash = strike. Counterdash does NOT count as aggressive. 3 strikes = autowin for opponent. If BOTH are passive, system does not apply.",
    "Running Rules: running for 4+ seconds banned. Spam side-dashing only to create distance also counts as running.",
    "Allowed competitive characters only: The Strongest Hero (Saitama), Hero Hunter (Garou), Brutal Demon (Metal Bat) — unless a host posts a different legal list for that event.",
    "1v1 competitive: do NOT use ultimate / Serious Mode / Rampage (G key). Play and coach with base kit only.",
  ],
  tryouts: [
    "Tryout body: FT3 or FT5 (hoster choice). Region/host must be stated (e.g. Sao Paulo, Miami, Dallas, Los Angeles).",
    "Optional conditions: e.g. no red line, no Paulistas, no Miami players, etc.",
    "No intentional delay / lagswitch during tryouts. Stay respectful.",
    "When server fills and event starts, mark tryout Locked.",
    "After tryout, applicant sends Discord username/tag to tryouter for registry.",
    "Tryout template fields: Tryout/FT, Region, Tu Phase, Condicion, Link.",
    "Results registered in the results channel; assign phase with: >phase 2 high weak @user (or bot 'stage / /stage).",
    "Tryouter max assignable phase = their own phase. If tryouter is above 2 High Strong, cap assignable is still 2 High Strong.",
  ],
  phases: [
    "Phases classify LATAM skill — not a universal global ladder. Players may earn phase on their host.",
    "Phase hosts: São Paulo BR; Miami FL; Dallas TX; Los Angeles CA.",
    "Phase 0 Supremo — peak LATAM mastery.",
    "Phase 1 Avanzado — top regional / Top LATAM-SA stable.",
    "Phase 2 Promedio — standard competitive level.",
    "Phase 3 En crecimiento — fundamentals OK, inconsistent.",
    "Phase 4 Principiante con base — basics (movement, dashes, simple combos).",
    "Phase 5 Nuevo en TSBL — new to the system.",
    "Inside a Phase: Tier High / Mid / Low (position in that phase).",
    "Sub-tier Strong / Stable / Weak (current form). Example label: Phase 2 High Weak.",
  ],
  coachHints: [
    "When reviewing a competitive clip, call out passive play, running, illegal macros/tech if visible, and character legality.",
    "Prefer advice that fits legal kits (Saitama / Garou / Metal Bat) unless the clip clearly shows another character in casual.",
    "If they stall or side-dash away for long stretches, cite Running Rules / Passive Strike.",
    "For tryout-style FT3/FT5 clips, judge composure and conversion — not only flashy movement.",
    "In 1v1 reviews: if they press G (Serious Mode / Rampage / ultimate), call it out — base kit only.",
  ],
};

function tsblPromptBlock() {
  return [
    `Competitive context: ${TSBL.name}`,
    "",
    "Leaderboard:",
    ...TSBL.leaderboard.map((l) => `- ${l}`),
    "",
    "Fair play / client:",
    ...TSBL.fairPlay.map((l) => `- ${l}`),
    "",
    "Match conduct:",
    ...TSBL.matchConduct.map((l) => `- ${l}`),
    "",
    "Tryouts:",
    ...TSBL.tryouts.map((l) => `- ${l}`),
    "",
    "Phases / stages:",
    ...TSBL.phases.map((l) => `- ${l}`),
    "",
    "While coaching competitive clips:",
    ...TSBL.coachHints.map((l) => `- ${l}`),
  ].join("\n");
}

module.exports = { TSBL, tsblPromptBlock };
