# <a href="https://palabra.ai"><img src="https://avatars.githubusercontent.com/u/199107821?s=32" alt="Palabra AI" align="center"></a> Palabra AI TypeScript Library

🌍 A TypeScript library for Palabra AI's real-time speech-to-speech translation API.
🚀 Break down language barriers and enable seamless communication across 25+ languages.

## Overview 📋

🎯 The `@palabra-ai/translator` TypeScript library enables you to integrate real-time speech translation into your Web applications.
Whether you're building a new application, enhancing an existing product, or streamlining business processes, this library has the tools you need.
With Palabra AI, you can:

* ⚡ Translate live speech in real time, making conversations smooth and natural
* 🎙️ Preserve the original speaker's voice and tone in translated speech
* 🔄 Convert spoken language instantly into accurate, readable text — great for captions, accessibility, and analysis

## Installation

```bash
npm install @palabra-ai/translator
# or
pnpm add @palabra-ai/translator
# or
yarn add @palabra-ai/translator
```

## Prerequisites

- A modern web browser (uses WebRTC and Web Audio APIs)
- [Palabra API credentials](https://docs.palabra.ai/docs/auth/obtaining_api_keys)

## Quick Start
Follow the steps below to run your first translation using Palabra AI's TypeScript library.

### 1. Get a local audio track

Use a function to return a `MediaStreamTrack` from the user's microphone:

```ts
import { getLocalAudioTrack } from '@palabra-ai/translator';
```

### 2. Initialize the client

```ts
import { PalabraClient } from '@palabra-ai/translator';

const client = new PalabraClient({
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
  },
  translateFrom: 'en', // Source language code
  translateTo: 'es',   // Target language code
  handleOriginalTrack: getLocalAudioTrack, // Function returning a MediaStreamTrack
});
```

### 3. Start translation

```ts
await client.startTranslation();
```

### 4. Play translated audio

```ts
await client.startPlayback();
```

### 5. Stop translation and playback

```ts
await client.stopPlayback();
await client.stopTranslation();
```

### 6. Output device changing

> [!NOTE]
> Audio output device switching is supported only in browsers that implement setSinkId(). In unsupported browsers like Safari, this method will have no effect.
> 
```ts
await client.changeAudioOutputDevice('deviceId')
```

### 7. Volume changing for audio track by language

> [!NOTE]
> Volume should be a value between 0.0 and 1.0, where 0.0 is muted and 1.0 is maximum volume.
> 
```ts
client.setVolume('es', .7)
```

> [!NOTE]
> Browsers may restrict audio playback initiated without user interaction.
> Each browser may also define user interaction differently.
> (For example, Safari on iOS is restrictive.)

## API Reference

See TypeScript types for full API documentation.

## PalabraClient

The `PalabraClient` class is the main entry point for integration with the Palabra API.
It manages connection setup, session lifecycle, audio handling, transcription and translation events, and playback of translated speech.

### Features

Key features of `PalabraClient`:
* Connects to the Palabra API
* Manages translation sessions
* Manages language settings
* Emits events for transcription and translation results
* Plays translated audio in the browser
* Manages target languages and session configuration

### Constructor

```ts
new PalabraClient(options: PalabraClientData)
```

#### Parameters  

* `auth`: Authentication data (either `clientId`/`clientSecret` or `userToken`)  
* `translateFrom`: Source language code (e.g., 'en')  
* `translateTo`: Target language code (e.g., 'es')  
* `handleOriginalTrack`: Function returning the original audio track (MediaStreamTrack)  
* `apiBaseUrl` (optional): API URL (defaults to Palabra cloud)

### Public Methods

- `startTranslation(): Promise<boolean>`  
  Starts a translation session and connects the audio stream.
  Returns `true` on success.

- `stopTranslation(): Promise<void>`
  Stops a translation session and disconnects the transport.

- `startPlayback(): Promise<void>`  
  Enables playback of translated audio in the browser.

- `stopPlayback(): Promise<void>`  
  Stops playback of translated audio.

- `setTranslateFrom(langCode: SourceLangCode): Promise<void>`  
  Changes the source language for translation on the fly.

- `setTranslateTo(langCode: TargetLangCode): Promise<void>`  
  Changes the target language for translation on the fly.

- `addTranslationTarget(langCode: TargetLangCode): Promise<void>`  
  Adds a target language for translation.

- `removeTranslationTarget(langCode: TargetLangCode | TargetLangCode[]): Promise<void>`  
  Removes one or more target languages from translation.

- `muteOriginalTrack(): void`  
  Mutes the original audio track (microphone).

- `unmuteOriginalTrack(): void`  
  Unmutes the original audio track (microphone).

- `setVolume(language: string, volume: number): void`  
Set volume for audio track by given language. Volume should be between 0.0 (muted) and 1.0 (maximum)

- `changeAudioOutputDevice(deviceId: string): Promise<void>`
  Change output device
  > Note: Audio output device switching is supported only in browsers that implement setSinkId(). In unsupported browsers like Safari, this method will have no effect.
  > 

- `cleanup(): Promise<void>`  
  Stops translation and playback, releases resources, and resets the client to its initial state.

## Events

The `PalabraClient` class provides events that let you track connection status, receive audio tracks, and handle transcription and translation results.

[//]: # (Come back to this line...)
You can use these events to update your UI, handle errors, and get real-time updates during the speech processing flow — from connecting to receiving translated audio and text.

```ts
const client = new PalabraClient({
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
  },
  translateFrom: 'en', // Source language code
  translateTo: 'es',   // Target language code
  handleOriginalTrack: getLocalAudioTrack, // Function returning a MediaStreamTrack
});

client.on(EVENT_REMOTE_TRACKS_UPDATE, (tracksData) => {
    // Process tracks
});
```

`EVENT_REMOTE_TRACKS_UPDATE` - An update has occurred to the set of remote audio tracks. (Use this event to access new audio streams.)  
`EVENT_ROOM_CONNECTED` - The WebRTC room connection was established.  
`EVENT_ROOM_DISCONNECTED` - The WebRTC room connection closed or lost.  
`EVENT_CONNECTION_STATE_CHANGED` - The connection state has changed (e.g., connecting, connected, disconnected).  
`EVENT_DATA_RECEIVED` - Custom data or messages have been received from the server via the WebRTC data channel.   
`EVENT_START_TRANSLATION` - The translation process has started.  
`EVENT_STOP_TRANSLATION` – The translation process has stopped.  
`EVENT_TRANSCRIPTION_RECEIVED` - The full transcription (recognized text) of the source audio has been received.  
`EVENT_TRANSLATION_RECEIVED` - The full, written translation of the source audio has been received.  
`EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED` - A partial translation of the transcription has been received.  
`EVENT_PARTIAL_TRANSCRIPTION_RECEIVED` - A partial transcription has been received. (Useful for real-time updates.)  
`EVENT_PIPELINE_TIMINGS_RECEIVED` - Timing or performance data about the translation pipeline has been received. (Useful for diagnostics and/or analytics.)  
`EVENT_ERROR_RECEIVED` - An error in the translation or streaming process has occurred.  

## Usage Examples

### Basic: Start translation and playback

```ts
import { PalabraClient, getLocalAudioTrack } from '@palabra-ai/translator';

// 1. Create the client
const client = new PalabraClient({
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
  },
  translateFrom: 'en',
  translateTo: 'es',
  handleOriginalTrack: getLocalAudioTrack,
});

// 2. Start translation session
await client.startTranslation();

// 3. Start playback of translated audio
await client.startPlayback();

// 4. Stop translation and playback when done
await client.stopPlayback();
await client.stopTranslation();
```

---

### Advanced: Output translated audio to a custom `<audio>` element

Listen for the `EVENT_REMOTE_TRACKS_UPDATE` event to get the translated audio tracks and play them in your own `<audio>` element:

```ts
import { PalabraClient, getLocalAudioTrack } from '@palabra-ai/translator';
import { EVENT_REMOTE_TRACKS_UPDATE } from '@palabra-ai/translator';

// Create an <audio> element in your code
const audioElement = new Audio();

const client = new PalabraClient({
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
  },
  translateFrom: 'en',
  translateTo: 'fr',
  handleOriginalTrack: getLocalAudioTrack,
});

client.on(EVENT_REMOTE_TRACKS_UPDATE, (tracks) => {
  // tracks - RemoteTrackInfo[]
  // tracks is an array of { track: MediaStreamTrack, ... }
  audioElement.srcObject = new MediaStream(tracks.map(t => t.track));
  audioElement.play();
});

// Start translation as usual
await client.startTranslation();

// Handle playback 
const stopPlayback = () => {
  audioElement.value.pause();
};

const startPlayback = () => {
  audioElement.value.play();
};
```

---

The examples below show how to integrate Palabra's real-time translation into any web application and control audio output as needed.

## PalabraAsrClient

The `PalabraAsrClient` class is the entry point for the [realtime STT API](https://docs.palabra.ai/docs/streaming_api/realtime_stt).
It captures an audio track, streams it to the API as raw chunks and emits partial, final and translated transcriptions.

### Features

* Opens an STT session over a websocket, the whole configuration goes into the query
* Captures the track into `pcm_s16le` chunks of 320 ms with an `AudioWorklet`
* Emits partial results while speaking and final ones on every end of sentence
* Optionally emits translations of the final transcriptions
* Mutes the source track without dropping the session

### Constructor

```ts
new PalabraAsrClient(options: PalabraAsrClientData)
```

#### Parameters

* `auth`: `{ apiKey }` — API key from [platform.palabra.ai/api-keys](https://platform.palabra.ai/api-keys)
* `createSession` (optional): function returning `{ streamUrl, token }`, use it to keep the API key on your backend
* `handleOriginalTrack`: function returning the track to transcribe, `getLocalAudioTrack` covers the microphone
* `language` (optional): spoken language, `auto` (default) lets the API detect it
* `translateLanguages` (optional): target languages of the `translated_transcription` messages
* `enableFillerFilter` (optional): filler filter, enabled by the API for every language except Japanese
* `wsBaseUrl` (optional): `ASR_WS_BASE_URL_EU` (default) or `ASR_WS_BASE_URL_US`
* `audioContext` (optional): existing audio context to capture in
* `chunkMs` (optional): size of the audio chunks, defaults to the recommended 320 ms

### Public Methods

- `startTranscription(): Promise<boolean>` — take the track, connect and start streaming
- `stopTranscription(): Promise<void>` — stop the capture, close the socket and release the track
- `muteOriginalTrack()` / `unmuteOriginalTrack()` / `isOriginalTrackMuted()`
- `setLanguage(language)`, `setTranslateLanguages(languages)` — restart an ongoing session, the config lives in the query
- `getConfig()`, `getSessionStatus()`, `getConnectionStatus()`, `getOriginalTrack()`
- `cleanup(): Promise<void>` — stop the session and close the audio context

### Events

`EVENT_ASR_SESSION_STARTED` / `EVENT_ASR_SESSION_STOPPED` - The STT session has been opened or closed.
`EVENT_ASR_CONNECTED` / `EVENT_ASR_DISCONNECTED` - The websocket has been opened or closed (the close code and reason are passed).
`EVENT_ASR_CONNECTION_STATE_CHANGED` - The connection state has changed (`connecting`, `connected`, `disconnected`).
`EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED` - A partial transcription, updated while the phrase is still being spoken.
`EVENT_ASR_TRANSCRIPTION_RECEIVED` - A final transcription (`is_eos: true`).
`EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED` - A translation of a final transcription, only with `translateLanguages` set.
`EVENT_ASR_ERROR_RECEIVED` - A websocket level error.
`EVENT_ASR_MESSAGE_RECEIVED` - A raw message from the API.

### Usage Example

```ts
import {
  PalabraAsrClient,
  getLocalAudioTrack,
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSCRIPTION_RECEIVED,
} from '@palabra-ai/translator';

const asrClient = new PalabraAsrClient({
  auth: { apiKey: 'YOUR_API_KEY' },
  language: 'en',
  translateLanguages: ['es'],
  handleOriginalTrack: getLocalAudioTrack,
});

asrClient.on(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, (data) => {
  console.log('partial', data?.segment.text);
});

asrClient.on(EVENT_ASR_TRANSCRIPTION_RECEIVED, (data) => {
  console.log('final', data?.segment.text);
});

await asrClient.startTranscription();

// ...

await asrClient.stopTranscription();
await asrClient.cleanup();
```

### Notes

* The API keeps **one active session per key**: a second connection is rejected with `409` during the upgrade,
  so close the previous session before opening a new one.
* The configuration is passed in the query, so changing the language or the translation targets reconnects.
* Audio is sent as raw binary frames in the sample rate of the audio context, which is declared in the query.
* After a successful upgrade the API reports problems by closing the socket, there are no error messages on the wire.

---

## PalabraTtsClient

The `PalabraTtsClient` class is the entry point for the [realtime TTS API](https://docs.palabra.ai/docs/streaming_api/realtime_tts).
It keeps a websocket session, streams text to synthesize and plays the received audio chunks back gapless.

> 📖 [**TTS.md**](./TTS.md) — use cases, custom playback (own `<audio>` element, audio graph, WebRTC, raw chunks,
> Node.js), limits and gotchas.

### Features

* Opens a TTS session over a websocket and sends the `init` message
* Splits text into chunks accepted by the API and respects its rate limits
* Plays `pcm` chunks back to back through an `AudioContext`
* Exposes the synthesized speech as a `MediaStreamTrack`
* Emits events for audio chunks, finished generations and API errors

### Constructor

```ts
new PalabraTtsClient(options: PalabraTtsClientData)
```

#### Parameters

* `auth`: `{ apiKey }` — API key from [platform.palabra.ai/api-keys](https://platform.palabra.ai/api-keys)
* `createSession` (optional): function returning `{ streamUrl, token }`, use it to keep the API key on your backend
* `language`: language of the synthesized speech (e.g., 'en')
* `model` (optional): TTS model id (defaults to `auto`)
* `voiceOptions` (optional): `voice_id`, `speed` (0–2), `deaccent_strength` (0–1)
* `output` (optional): `format` (`pcm` | `mp3` | `wav`) and `sample_rate` (8000–48000), only `pcm` can be played chunk by chunk
* `wsBaseUrl` (optional): `TTS_WS_BASE_URL_EU` (default) or `TTS_WS_BASE_URL_US`
* `audioContext` (optional): existing audio context to play the speech in — its own rate then wins over `output.sample_rate`
* `ignoreAudioContext` (optional): skip the playback chain and only emit audio chunks

### Public Methods

- `startSession(): Promise<boolean>` — connect the websocket and send the `init` message
- `stopSession(): Promise<void>` — close the session and release the playback chain
- `speak(text: string, options?: TtsSpeakOptions): Promise<string>` — stream text, returns the `generationId`
- `cancel(): Promise<void>` — drop everything that is still being synthesized
- `startPlayback(): Promise<void>` / `stopPlayback(): Promise<void>`
- `setVolume(volume: number): void` / `getVolume(): number`
- `getSpeechTrack(): MediaStreamTrack | null`
- `setLanguage(language)`, `setVoiceOptions(options)`, `setOutput(output)` — the `init` message is immutable within a session, so an ongoing session is restarted
- `getConfig()`, `getSessionStatus()`, `getConnectionStatus()`
- `cleanup(): Promise<void>` — stop the session and close the audio context

### Events

`EVENT_TTS_SESSION_STARTED` / `EVENT_TTS_SESSION_STOPPED` - The TTS session has been opened or closed.
`EVENT_TTS_CONNECTED` / `EVENT_TTS_DISCONNECTED` - The websocket has been opened or closed (the close code and reason are passed).
`EVENT_TTS_CONNECTION_STATE_CHANGED` - The connection state has changed (`connecting`, `connected`, `disconnected`).
`EVENT_TTS_AUDIO_CHUNK_RECEIVED` - An audio chunk has been received (base64 audio, `generation_id`, `last_chunk`).
`EVENT_TTS_GENERATION_COMPLETED` - The last chunk of a generation has been received.
`EVENT_TTS_PLAYBACK_STARTED` / `EVENT_TTS_PLAYBACK_ENDED` - The playback of the scheduled chunks has started or drained.
`EVENT_TTS_ERROR_RECEIVED` - The API reported an error (see `TTS_RETRYABLE_ERROR_CODES`).
`EVENT_TTS_MESSAGE_RECEIVED` - A raw message from the API.
`EVENT_TTS_VOLUME_CHANGED` - The playback volume has changed.

### Usage Example

```ts
import {
  PalabraTtsClient,
  EVENT_TTS_GENERATION_COMPLETED,
  EVENT_TTS_ERROR_RECEIVED,
} from '@palabra-ai/translator';

const ttsClient = new PalabraTtsClient({
  auth: { apiKey: 'YOUR_API_KEY' },
  language: 'en',
  voiceOptions: { voice_id: 'default_low', speed: 1.0 },
});

ttsClient.on(EVENT_TTS_GENERATION_COMPLETED, ({ generationId }) => {
  console.log('finished', generationId);
});

ttsClient.on(EVENT_TTS_ERROR_RECEIVED, (error) => {
  console.error(error);
});

await ttsClient.startSession();
await ttsClient.startPlayback();

// a long text is split into chunks automatically
await ttsClient.speak('Hello, how can I help you today?');

// stream a sentence in parts and finalize it with the last call
const generationId = await ttsClient.speak('One moment', { isEos: false });
await ttsClient.speak('please', { generationId });

await ttsClient.stopSession();
await ttsClient.cleanup();
```

Attach the speech to your own element instead of the default output:

```ts
await ttsClient.startSession();

const audioElement = new Audio();
audioElement.srcObject = new MediaStream([ttsClient.getSpeechTrack()!]);
await audioElement.play();
```

---

## Monorepo Structure
## Development Setup

[//]: # (What is "this project")
This project contains two main packages:
- `@palabra-ai/translator`: The main library package `packages/lib`
- `dev-app`: A Vue.js development application for testing the library `packages/dev-app`

### Prerequisites

- [Node.js](https://nodejs.org/en) (latest LTS version recommended)
- [pnpm](https://pnpm.io/)

### Installation

```bash
# Install dependencies for all packages
pnpm install
```

### Running in Development Mode
#### Library Development

Run the library in watch mode (auto-rebuild on changes):

```bash
cd packages/lib
pnpm dev
```

#### Development Application

Run the dev app with hot-reload:

```bash
cd packages/dev-app
pnpm dev
```

Open `http://localhost:5173` in your browser to view the dev app.

### More Commands
#### Library Package `packages/lib`

- `pnpm build` - Build the library
- `pnpm test` - Run tests
- `pnpm lint` - Run linting

#### Development App `packages/dev-app`

- `pnpm build` - Build for production
- `pnpm dev` - Run dev app

## Supported Languages

### Speech Recognition Languages

🇸🇦 Arabic (AR), 🇨🇳 Chinese (ZH), 🇨🇿 Czech (CS), 🇩🇰 Danish (DA), 🇳🇱 Dutch (NL), 🇬🇧 English (EN), 🇫🇮 Finnish (FI), 🇫🇷 French (FR), 🇩🇪 German (DE), 🇬🇷 Greek (EL), 🇮🇱 Hebrew (HE), 🇭🇺 Hungarian (HU), 🇮🇹 Italian (IT), 🇯🇵 Japanese (JA), 🇰🇷 Korean (KO), 🇵🇱 Polish (PL), 🇵🇹 Portuguese (PT), 🇷🇺 Russian (RU), 🇪🇸 Spanish (ES), 🇹🇷 Turkish (TR), 🇺🇦 Ukrainian (UK)

### Translation Languages

🇸🇦 Arabic (AR), 🇧🇬 Bulgarian (BG), 🇨🇳 Chinese Mandarin (ZH), 🇨🇿 Czech (CS), 🇩🇰 Danish (DA), 🇳🇱 Dutch (NL), 🇬🇧 English UK (EN_GB), 🇺🇸 English US (EN_US), 🇫🇮 Finnish (FI), 🇫🇷 French (FR), 🇩🇪 German (DE), 🇬🇷 Greek (EL), 🇮🇱 Hebrew (HE), 🇭🇺 Hungarian (HU), 🇮🇩 Indonesian (ID), 🇮🇹 Italian (IT), 🇯🇵 Japanese (JA), 🇰🇷 Korean (KO), 🇵🇱 Polish (PL), 🇵🇹 Portuguese (PT), 🇧🇷 Portuguese Brazilian (PT_BR), 🇷🇴 Romanian (RO), 🇷🇺 Russian (RU), 🇸🇰 Slovak (SK), 🇪🇸 Spanish (ES), 🇲🇽 Spanish Mexican (ES_MX), 🇸🇪 Swedish (SV), 🇹🇷 Turkish (TR), 🇺🇦 Ukrainian (UK), 🇻🇳 Vietnamese (VN)

## License

MIT