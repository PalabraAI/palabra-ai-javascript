# Palabra Playground

A tiny local playground for the [Palabra](https://palabra.ai) real-time speech API. One small
Vue app, four live examples on one page:

- **Translator** — speak into your mic, hear the translation (speech-to-speech over WebRTC)
- **From Audio File** — translates a bundled sample clip, no microphone needed
- **Speech to Text** — realtime transcription over a websocket, with optional translation
- **Text to Speech** — realtime TTS with language/voice/speed controls

## Quick start

Requires Node.js ≥ 20 and a Palabra API key
([platform.palabra.ai/api-keys](https://platform.palabra.ai/api-keys)).

```bash
git clone https://github.com/PalabraAI/palabra-ai-javascript
cd palabra-ai-javascript/packages/playground
printf 'VITE_PALABRA_API_KEY=%s\n' "<your key>" > .env
npm ci
npm run dev
```

The playground is deliberately an island inside this pnpm monorepo: it pins the published
`@palabra-ai/translator` from npm and keeps its own `package-lock.json`, so it runs with plain
`npm ci` — no pnpm, no library build. That is what lets the AI-agent onboarding prompt set it up
in four commands. It is excluded from the pnpm workspace on purpose (`pnpm-workspace.yaml`).

Open the URL vite prints (usually `http://localhost:5173`), allow microphone access, press
**Start Translation** and speak. Sessions and usage show up at
[platform.palabra.ai/usage](https://platform.palabra.ai/usage).

> Setting up with an AI coding agent? See [AGENTS.md](./AGENTS.md).

## How auth works

One env var powers everything: `VITE_PALABRA_API_KEY`.

- The translator examples pass it as `auth: { userToken: key }`, which the library sends as
  `Authorization: Bearer <key>`.
- The TTS/STT examples pass it as `apiKey`, which goes into the websocket `?token=` param.

No `clientId` / `clientSecret` pair is needed anywhere in this project.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "No API key configured" screen | `.env` missing or malformed — recreate it and restart `npm run dev` |
| `npm ci` fails | Check `node --version` ≥ 20 |
| 401/403 on start | Key is wrong or revoked — create a new one at platform.palabra.ai/api-keys |
| Session refused right after signup | The free-credits grant lands asynchronously — wait a minute and retry |
| No translated audio | Check system output device; try the **From Audio File** tab to rule out the mic |

## Notes

- Built on the published [`@palabra-ai/translator`](https://www.npmjs.com/package/@palabra-ai/translator)
  package (pinned exact version, committed lockfile) — not on the workspace copy in `../lib`.
- `public/sample-en.wav` is a synthesized placeholder clip; replace it with your own audio to
  translate something else (English source expected by the From Audio File example).
