/**
 * TSBL / LATAM TSB Competitive rules.
 * Spanish is the league language; English is a toggle.
 */
const TSBL = {
  name: "TSBL (LATAM TSB Competitive)",
};

const ES = {
  leaderboard: {
    title: "Leaderboard",
    items: [
      "Para obtener un spot en la leaderboard necesitas el rol de tryout de P1. Ese rol te permite retar a cualquiera del Top 30.",
      "Cooldown: si pierdes, 7 días para volver a retar; si ganas, 4 días para aceptar otro reto. Se puede saltar si ambos jugadores están de acuerdo.",
      "Rango de reto: #30–#21 → 3 posiciones; #20–#11 → 2; #10–#1 → 1.",
      "Formatos 1v1 permitidos: FT5 / FT10 estándar; FT5 cross region; FT5 / 2 sets.",
    ],
  },
  fairplay: {
    title: "Fair play / cliente",
    items: [
      "Solo FFlags autorizados por Roblox en la Allowed List. Saltarse la seguridad del cliente para FFlags baneados anula el 1v1.",
      "Quitar el límite de FPS de Roblox (tope 240) está prohibido. Modificar física, MTU o texturas (mapa negro/blanco, etc.) está prohibido.",
      "Ajustes nativos de Bloxstrap que el cliente permite (ej. bajar texturas) están permitidos. Fishtrap, Voidstrap u otras versiones modificadas están prohibidas.",
      "Lagswitch y tab glitch están prohibidos en 1v1 y glads.",
      "Macros permitidos: solo backdash cancel / insta ragdoll. Prohibidos: ABA Tech, Hybrid Forward Dash (side + front), macros de cámara (lethal tech, Lee twisted, similares).",
      "Scripts / exploiting = ban permanente del competitivo.",
    ],
  },
  conduct: {
    title: "Conducta en partida",
    items: [
      "Passive Strike: más de 12 segundos sin un dash agresivo = strike. El counterdash NO cuenta como agresivo. 3/3 strikes = autowin para el rival. Si ambos son pasivos, no se aplica.",
      "Running: correr 4+ segundos está prohibido. Spamear side dash solo para tomar distancia también cuenta como running.",
      "Personajes permitidos: The Strongest Hero (Saitama), Hero Hunter (Garou), Brutal Demon (Metal Bat) — salvo que el host publique otra lista para ese evento.",
      "En 1v1 competitivo NO se usa ultimate / Modo Serio / Rampage (tecla G). Solo kit base.",
    ],
  },
  tryouts: {
    title: "Tryouts",
    items: [
      "Formato: FT3 o FT5 (elección del hoster). Hay que indicar región/host (São Paulo, Miami, Dallas, Los Angeles).",
      "Condición opcional: ej. no tocar la línea roja, sin paulistas, sin gente de Miami, etc.",
      "Respeto y sin trampas. Prohibido delay intencional o lagswitch.",
      "Cuando el servidor se llene e inicie el evento, se marca Locked.",
      "Al terminar, el aplicante envía su username / tag de Discord al tryouter para registrar el resultado.",
      "Plantilla: Tryout/FT, Región, Tu Phase, Condición, Link.",
      "Los resultados se registran en el canal de resultados. Asignar phase: >phase 2 high weak @user (o 'stage / /stage del bot).",
      "La phase máxima que el tryouter puede dar es la suya. Si el tryouter está por encima de 2 High Strong, el tope sigue siendo 2 High Strong.",
    ],
  },
  phases: {
    title: "Phases / stages",
    items: [
      "Las Phases clasifican el nivel en LATAM — no es un ranking global. Se puede obtener phase en el host del jugador.",
      "Hosts: São Paulo BR; Miami FL; Dallas TX; Los Angeles CA.",
      "Phase 0 Supremo — dominio máximo en LATAM.",
      "Phase 1 Avanzado — nivel alto y estable (Top LATAM/SA).",
      "Phase 2 Promedio — nivel competitivo estándar de la región.",
      "Phase 3 En crecimiento — fundamentos claros, todavía irregular.",
      "Phase 4 Principiante con base — movimientos, dashes y combos simples.",
      "Phase 5 Nuevo en TSBL — recién empieza en el sistema.",
      "Dentro de la Phase: Tier High / Mid / Low (posición en esa phase).",
      "Sub-tier Strong / Stable / Weak (forma actual). Ejemplo: Phase 2 High Weak.",
    ],
  },
  coachHints: [
    "En clips competitivos, señala pasividad, running, macros/tech ilegales si se ven, y legalidad de personaje.",
    "Consejos sobre kits legales (Saitama / Garou / Metal Bat) salvo que el clip sea casual con otro personaje.",
    "Si stallan o side-dashean lejos rato, cita Running / Passive Strike.",
    "En tryouts FT3/FT5, prioriza compostura y conversión, no solo movimiento flashy.",
    "En 1v1: si pulsan G (Modo Serio / Rampage / ultimate), márcalo como error — solo kit base.",
  ],
  ui: {
    pick: "Elige una sección",
    askHint: "Pregunta concreta con `'ask …`. Inglés: `'rules en`.",
    footerAsk: "Pregunta concreta con `'ask …`.",
  },
};

const EN = {
  leaderboard: {
    title: "Leaderboard",
    items: [
      "To get a leaderboard spot you need the P1 tryout role. That role lets you challenge Top 30.",
      "Cooldown: loser waits 7 days to challenge again; winner waits 4 days to accept another challenge. Both players may waive it by agreement.",
      "Challenge range: #30–#21 → 3 spots; #20–#11 → 2; #10–#1 → 1.",
      "Allowed 1v1 formats: FT5 / FT10 standard; FT5 cross-region; FT5 / 2 sets.",
    ],
  },
  fairplay: {
    title: "Fair play / client",
    items: [
      "Only Roblox-authorized FFlags from the Allowed List. Bypassing client security for banned FFlags voids the 1v1.",
      "Removing Roblox's FPS cap (240) is banned. Physics / MTU / unauthorized texture mods (all black/white maps) are banned.",
      "Native Bloxstrap settings the client allows (e.g. lower textures) are OK. Fishtrap / Voidstrap / modified forks are banned.",
      "Lagswitch and tab-glitch are banned in 1v1 / glads.",
      "Macros: ONLY backdash cancel / insta ragdoll. Banned: ABA Tech, Hybrid Forward Dash (side+front), camera macros (lethal tech, Lee twisted, similar).",
      "Scripts / exploiting = permanent competitive ban.",
    ],
  },
  conduct: {
    title: "Match conduct",
    items: [
      "Passive Strike: >12 seconds without an aggressive dash = strike. Counterdash does NOT count. 3/3 = autowin for the opponent. If BOTH are passive, it does not apply.",
      "Running for 4+ seconds is banned. Spam side-dashing only to create distance also counts as running.",
      "Legal characters: The Strongest Hero (Saitama), Hero Hunter (Garou), Brutal Demon (Metal Bat) — unless the host posts a different list for that event.",
      "Competitive 1v1: do NOT use ultimate / Serious Mode / Rampage (G). Base kit only.",
    ],
  },
  tryouts: {
    title: "Tryouts",
    items: [
      "Format: FT3 or FT5 (hoster choice). Region/host must be stated (São Paulo, Miami, Dallas, Los Angeles).",
      "Optional condition: e.g. no red line, no Paulistas, no Miami players, etc.",
      "Stay respectful. No intentional delay / lagswitch.",
      "When the server fills and the event starts, mark it Locked.",
      "After the tryout, the applicant sends Discord username/tag to the tryouter to register the result.",
      "Template: Tryout/FT, Region, Tu Phase, Condición, Link.",
      "Results go in the results channel. Assign phase with: >phase 2 high weak @user (or bot 'stage / /stage).",
      "Tryouter max assignable phase = their own. If they are above 2 High Strong, the ceiling is still 2 High Strong.",
    ],
  },
  phases: {
    title: "Phases / stages",
    items: [
      "Phases classify LATAM skill — not a global ladder. Players may earn phase on their host.",
      "Hosts: São Paulo BR; Miami FL; Dallas TX; Los Angeles CA.",
      "Phase 0 Supremo — peak LATAM mastery.",
      "Phase 1 Avanzado — high, stable regional level (Top LATAM/SA).",
      "Phase 2 Promedio — standard competitive level.",
      "Phase 3 En crecimiento — fundamentals OK, still inconsistent.",
      "Phase 4 Principiante con base — movement, dashes, simple combos.",
      "Phase 5 Nuevo en TSBL — new to the system.",
      "Inside a Phase: Tier High / Mid / Low.",
      "Sub-tier Strong / Stable / Weak. Example: Phase 2 High Weak.",
    ],
  },
  coachHints: [
    "When reviewing a competitive clip, call out passive play, running, illegal macros/tech if visible, and character legality.",
    "Prefer legal kits (Saitama / Garou / Metal Bat) unless the clip is clearly casual with another character.",
    "If they stall or side-dash away for long stretches, cite Running / Passive Strike.",
    "For tryout FT3/FT5 clips, judge composure and conversion — not only flashy movement.",
    "In 1v1 reviews: if they press G (Serious Mode / Rampage / ultimate), call it out — base kit only.",
  ],
  ui: {
    pick: "Pick a rules section",
    askHint: "Ask a specific question with `'ask …`. Español: `'rules es`.",
    footerAsk: "Ask a specific question with `'ask …`.",
  },
};

const PACKS = { es: ES, en: EN };
const SECTION_KEYS = ["leaderboard", "fairplay", "conduct", "tryouts", "phases"];

function normalizeLang(raw) {
  const t = String(raw || "").toLowerCase();
  if (t === "en" || t === "english" || t === "inglés" || t === "ingles") return "en";
  return "es";
}

function detectLang(text) {
  const t = String(text || "").trim();
  if (!t) return "es";
  if (/^(en|english|inglés|ingles)\b/i.test(t)) return "en";
  if (/^(es|español|espanol|spanish)\b/i.test(t)) return "es";
  const esHits = (t.match(/\b(qué|que|cómo|como|cuál|cual|dónde|donde|cuál|fase|fases|reto|retar|personaje|prohibido|tryout|phase|cooldown|rango)\b/gi) || []).length;
  const enHits = (t.match(/\b(what|what's|whats|how|which|where|why|who|can|is|are|the|challenge|cooldown|allowed|banned)\b/gi) || []).length;
  if (enHits >= 2 && enHits > esHits) return "en";
  return "es";
}

function tsblPack(lang) {
  return PACKS[normalizeLang(lang)] || ES;
}

function tsblSectionKeys() {
  return SECTION_KEYS.slice();
}

function tsblSection(key, lang = "es") {
  const pack = tsblPack(lang);
  return pack[key] || pack.leaderboard;
}

function tsblPromptBlock(lang = "es") {
  const pack = tsblPack(lang);
  const L = normalizeLang(lang);
  const labels =
    L === "en"
      ? {
          ctx: "Competitive context",
          fair: "Fair play / client",
          conduct: "Match conduct",
          coach: "While coaching competitive clips",
        }
      : {
          ctx: "Contexto competitivo",
          fair: "Fair play / cliente",
          conduct: "Conducta en partida",
          coach: "Al coachear clips competitivos",
        };
  return [
    `${labels.ctx}: ${TSBL.name}`,
    "",
    `${pack.leaderboard.title}:`,
    ...pack.leaderboard.items.map((l) => `- ${l}`),
    "",
    `${labels.fair}:`,
    ...pack.fairplay.items.map((l) => `- ${l}`),
    "",
    `${labels.conduct}:`,
    ...pack.conduct.items.map((l) => `- ${l}`),
    "",
    `${pack.tryouts.title}:`,
    ...pack.tryouts.items.map((l) => `- ${l}`),
    "",
    `${pack.phases.title}:`,
    ...pack.phases.items.map((l) => `- ${l}`),
    "",
    `${labels.coach}:`,
    ...pack.coachHints.map((l) => `- ${l}`),
  ].join("\n");
}

module.exports = {
  TSBL,
  TSBL_ES: ES,
  TSBL_EN: EN,
  tsblPromptBlock,
  tsblSectionKeys,
  tsblSection,
  tsblPack,
  normalizeLang,
  detectLang,
};
