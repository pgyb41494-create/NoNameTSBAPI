const { knowledgePrompt } = require("../coach/knowledge");
const profiles = require("./profiles");

function hasAiKey() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

function identityBrief(profile) {
  return [
    `Linked Discord ID: ${profile.discord_id}`,
    `Profile ID: ${profile.profile_id}`,
    `Roblox username: ${profile.roblox_username}`,
    `Roblox display name: ${profile.roblox_display_name || profile.roblox_username}`,
    `Roblox user id: ${profile.roblox_id || "unknown"}`,
    `Avatar URL: ${profile.roblox_avatar_url || "none"}`,
    "The clip MUST show this player's username (nametag / profile name) and should look like this avatar.",
    "If you cannot confirm identity, set verified=false and do not give a full coaching review.",
  ].join("\n");
}

async function callGemini({ prompt, frames }) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.COACH_MODEL || "gemini-2.0-flash";
  const parts = [{ text: prompt }];
  for (const frame of frames || []) {
    if (!frame?.b64) continue;
    parts.push({
      inline_data: {
        mime_type: frame.mime || "image/jpeg",
        data: frame.b64,
      },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.4 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini failed (${res.status})`);
  }
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
}

async function callOpenAI({ prompt, frames }) {
  const key = process.env.OPENAI_API_KEY;
  const content = [{ type: "text", text: prompt }];
  for (const frame of (frames || []).slice(0, 8)) {
    if (!frame?.b64) continue;
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${frame.mime || "image/jpeg"};base64,${frame.b64}`,
      },
    });
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_COACH_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: knowledgePrompt() },
        { role: "user", content },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI failed (${res.status})`);
  return data?.choices?.[0]?.message?.content || "";
}

function parseVerdict(text) {
  const lower = String(text || "").toLowerCase();
  const denied =
    lower.includes("verified=false") ||
    lower.includes("identity: no") ||
    lower.includes("cannot confirm") ||
    lower.includes("not the linked");
  const confirmed =
    lower.includes("verified=true") ||
    lower.includes("identity: yes") ||
    lower.includes("this is the linked");
  return { verified: confirmed && !denied, raw: text };
}

async function reviewClip({ guildId, discordId, videoUrl, frames }) {
  const profile = profiles.getProfile(guildId, discordId);
  if (!profile?.roblox_username) {
    return {
      ok: false,
      code: "no_profile",
      message: "Create and verify `/profile` with your Roblox account first. The coach uses that username and avatar to confirm the clip is you.",
    };
  }

  if (!videoUrl && !(frames && frames.length)) {
    return {
      ok: false,
      code: "no_video",
      message: "Upload a video or paste a Medal / YouTube / Discord link.",
    };
  }

  if (!hasAiKey()) {
    return {
      ok: false,
      code: "no_ai",
      message:
        "Coach AI is not connected yet. Add GEMINI_API_KEY (or OPENAI_API_KEY) and drop your training notes in `NoNameBotAPI/src/coach/knowledge.js`. Your profile is ready — clips will be identity-checked once the key is set.",
      profile: profiles.publicProfile(profile),
    };
  }

  const prompt = [
    knowledgePrompt(),
    "",
    "Player to verify:",
    identityBrief(profile),
    "",
    videoUrl ? `Clip URL: ${videoUrl}` : "Clip frames are attached.",
    "",
    "Start the reply with exactly one of:",
    "verified=true",
    "verified=false",
    "Then write the review.",
  ].join("\n");

  const text = process.env.GEMINI_API_KEY
    ? await callGemini({ prompt, frames })
    : await callOpenAI({ prompt, frames });

  const verdict = parseVerdict(text);
  return {
    ok: true,
    verified: verdict.verified,
    review: text,
    profile: profiles.publicProfile(profile),
  };
}

module.exports = { reviewClip, hasAiKey };
