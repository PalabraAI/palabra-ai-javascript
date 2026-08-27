# Instructions for AI coding agents

This project is designed to be set up by an AI agent in one pass. Follow these steps exactly —
do not improvise around them.

## Setup

Run everything from this directory (`packages/playground`). The repo root is a pnpm workspace for
the library; the playground uses plain npm with its own lockfile — never install at the root.

```bash
node --version   # must be >= 20; stop and tell the user if it isn't
printf 'VITE_PALABRA_API_KEY=%s\n' "$PALABRA_API_KEY" > .env
npm ci           # not `npm install` — the lockfile is the source of truth
npm run dev
```

Read the local URL from vite's output (usually http://localhost:5173, but vite picks the next
free port if 5173 is busy) and give the user that **exact** URL.

## Rules

- The only credential is `VITE_PALABRA_API_KEY` in `.env`. Never ask the user for a
  `clientId` / `clientSecret` pair — this project does not use them.
- There is no Palabra CLI. Everything goes through this app or the `@palabra-ai/translator`
  library.
- `@palabra-ai/translator` is browser-only (WebRTC + Web Audio). Never import it in Node.
- Do not add dependencies, change pinned versions, or edit `package-lock.json` during setup.

## What to tell the user

Open the URL, allow microphone access, press **Start Translation** on the Translator tab and
speak English — translated Spanish speech plays back within a second. No microphone? Use the
**From Audio File** tab: it translates a bundled sample clip with one click.

Every run creates a session visible at https://platform.palabra.ai/usage, billed against the
account's free credits.

## Troubleshooting

- "No API key configured" screen → the `.env` write was skipped or malformed; redo it and
  restart the dev server.
- 401/403 → the key is wrong or revoked; the user can create a new one at
  https://platform.palabra.ai/api-keys.
- Session refused right after signup → the free-credits grant lands asynchronously; wait about
  a minute and retry once.
