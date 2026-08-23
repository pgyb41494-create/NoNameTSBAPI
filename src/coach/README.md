# TSB AI Coach — get an API key

The coach does **not** upload your MP4 to “train” a model.
It uses:
1. Your notes in `src/coach/knowledge.js` (the brief)
2. Frames from the clip the player uploads
3. A vision model via **Gemini** (recommended) or OpenAI

## Free Gemini key (recommended)

1. Open https://aistudio.google.com/apikey  
2. Sign in with Google  
3. Click **Create API key**  
4. Copy the key  

## Put it on Railway (API service = NoNameTSBAPI)

Variables:
```
GEMINI_API_KEY=paste_your_key_here
COACH_MODEL=gemini-3.5-flash
```

Uses the Gemini **Interactions API** (`/v1beta/interactions`). Dead models like `gemini-2.0-flash` are auto-remapped to `gemini-3.5-flash`.

Redeploy the API. Then in Discord:
1. `/profile` → link Roblox  
2. `/tsbcoach` with a video (or `'tsbcoach` + attachment/link)

## Optional OpenAI instead

```
OPENAI_API_KEY=sk-...
```
(Only used if `GEMINI_API_KEY` is empty.)

## `'ask` chat (Groq)

`'ask` does **not** use Gemini (Google blocks the full TSBCC rule text). Use Groq instead:

1. Open https://console.groq.com/keys
2. Create an API key
3. On the **API** Railway service:

```
GROQ_API_KEY=gsk_...
GROQ_ASK_MODEL=llama-3.3-70b-versatile
```

`OPENAI_API_KEY` is used for `'ask` only if Groq is missing.

## Adding more “training”

Edit `src/coach/knowledge.js` — add fundamentals, character routes, and mistakes you care about.
Drop example frames under `src/coach/examples/` for your own reference (the live coach still uses each user’s uploaded clip).
