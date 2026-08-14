# NoNameTSBAPI

JSON store and HTTP API for the TSB clan bot and website.

## Setup

```bash
npm install
copy .env.example .env
npm start
```

Listens on `http://localhost:8787` by default.

- Public: `GET /api/public`, `GET /api/public/stats`
- Bot: ` /api/bot/*` (send `x-bot-token` if `API_TOKEN` is set)

Coach training notes: `src/coach/knowledge.js`

Repo: https://github.com/pgyb41494-create/NoNameTSBAPI
