# @palabra-ai/translator

A TypeScript library for Palabra AI's real-time speech-to-speech translation API. Break down language barriers and enable seamless communication across 25+ languages.

## Overview 

The @palabra-ai/translator TypeScript library enables you to integrate real-time speech translation into your Web applications. Whether you're building a new application, enhancing an existing product, or streamlining business processes, this library gives you the tools to:

## Features

* Real-Time Speech-to-Speech Translation: Instantly translate live speech, making conversations feel smooth and natural
* Voice Cloning & Management: Preserve the original speaker's voice and emotional nuances in translated speech
* Real-Time Transcription: Instantly convert spoken language into accurate, readable text as the speech occurs — ideal for captions, accessibility, and analysis.


## Installation

```bash
npm install @palabra-ai/translator
# or
pnpm add @palabra-ai/translator
# or
yarn add @palabra-ai/translator
```

## Requirements

- Runs in modern browsers (uses WebRTC and Web Audio APIs)
- Requires Palabra API credentials (see [Palabra documentation](https://docs.palabra.ai/docs/auth/obtaining_api_keys))

## Quick Start

### 1. Get a local audio track

You need to provide a function that returns a `MediaStreamTrack` from the user's microphone. The library provides a helper for this:

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

    Audio playback
    Browsers can be restrictive with regards to audio playback that is not initiated by user interaction. What each browser considers as user interaction can vary by vendor (for example, Safari on iOS is very restrictive).

## API Reference

See TypeScript types for full API documentation.

## PalabraClient

The `PalabraClient` class is the main entry point for integrating real-time speech-to-speech translation using the Palabra API. It manages connection setup, session lifecycle, audio handling, transcription and translation events, and playback of translated speech.

### Key Features

* Connects to the Palabra API for real-time speech translation
* Manages translation sessions and language settings
* Emits events for transcription and translation results
* Plays translated audio in the browser
* Flexible management of target languages and session configuration

### Constructor

```ts
new PalabraClient(options: PalabraClientData)
```

Parameters:  
`auth`: Authentication data (either clientId/clientSecret or userToken)  
`translateFrom`: Source language code (e.g., 'en')  
`translateTo`: Target language code (e.g., 'es')  
`handleOriginalTrack`: Function returning the original audio track (MediaStreamTrack)  
`apiBaseUrl` (optional): API URL (defaults to Palabra cloud)  

### Public Methods

- `startTranslation(): Promise<boolean>`  
  Starts a translation session and connects the audio stream. Returns `true` on success.

- `stopTranslation(): Promise<void>`  
  Stops the translation session and disconnects the transport.

- `startPlayback(): Promise<void>`  
  Enables playback of translated audio in the browser.

- `stopPlayback(): Promise<void>`  
  Stops playback of translated audio.

- `setTranslateFrom(langCode: SourceLangCode): Promise<void>`  
  Changes the source language for translation on the fly.

- `setTranslateTo(langCode: TargetLangCode): Promise<void>`  
  Changes the target language for translation on the fly.

- `addTranslationTarget(langCode: TargetLangCode): Promise<void>`  
  Adds an additional target language for translation.

- `removeTranslationTarget(langCode: TargetLangCode | TargetLangCode[]): Promise<void>`  
  Removes one or more target languages from translation.

- `muteOriginalTrack(): void`  
  Mutes the original audio track (microphone).

- `unmuteOriginalTrack(): void`  
  Unmutes the original audio track (microphone).

- `cleanup(): Promise<void>`  
  Stops translation and playback, releases resources, and resets the client to its initial state as it was after creation.


## Events
PalabraClient provides events that let you track connection status, receive audio tracks, and handle transcription and translation results.

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

`EVENT_REMOTE_TRACKS_UPDATE` - Fired when the set of remote audio tracks is updated. Use this to get new audio streams.  
`EVENT_ROOM_CONNECTED` - Emitted when the WebRTC room connection is successfully established.  
`EVENT_ROOM_DISCONNECTED` - Emitted when the WebRTC room connection is closed or lost.  
`EVENT_CONNECTION_STATE_CHANGED` - Fired when the connection state changes (e.g., connecting,   connected, disconnected).  
`EVENT_DATA_RECEIVED` - Emitted when custom data or messages are received from the server via the WebRTC data channel.   
`EVENT_START_TRANSLATION` - Fired when the translation process starts.  
`EVENT_STOP_TRANSLATION` – Fired when the translation process is stopped.
`EVENT_TRANSCRIPTION_RECEIVED` - Emitted when a full transcription (recognized text) is received for the source audio.  
`EVENT_TRANSLATION_RECEIVED` - – Emitted when the full translated transcription of the source audio is received  
`EVENT_PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED` - Emitted when a partial (intermediate) translation of the transcription is received.  
`EVENT_PARTIAL_TRANSCRIPTION_RECEIVED` - Emitted when a partial (intermediate) transcription is received (before the full phrase is recognized) (useful for real-time updates).  
`EVENT_PIPELINE_TIMINGS_RECEIVED` - Fired when timing or performance data about the translation pipeline is received (for diagnostics or analytics).  
`EVENT_ERROR_RECEIVED` - Emitted when an error occurs in the translation or streaming process.   

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

You can listen for the `EVENT_REMOTE_TRACKS_UPDATE` event to get the translated audio tracks and play them in your own `<audio>` element:

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

You can use these patterns to integrate Palabra's real-time translation into any web application and control audio output as needed.

## Monorepo structure

## Development Setup

This project is a monorepo containing two main packages:
- `@palabra-ai/translator`: The main library package `packages/lib`
- `dev-app`: A Vue.js development application for testing the library `packages/dev-app`

### Prerequisites

- Node.js (latest LTS version recommended)
- pnpm (package manager)

### Installation

```bash
# Install dependencies for all packages
pnpm install
```

### Running in Development Mode

#### Library Development
To run the library in watch mode (auto-rebuilds on changes):
```bash
cd packages/lib
pnpm dev
```

#### Development App
To run the development application with hot-reload:
```bash
cd packages/dev-app
pnpm dev
```

The development app will be available at `http://localhost:5173`

### Additional Commands

#### Library Package `packages/lib`
- `pnpm build` - Build the library
- `pnpm test` - Run tests
- `pnpm lint` - Run linting

#### Development App `packages/dev-app`
- `pnpm build` - Build for production
- `pnpm dev` - Run dev application

## Supported Languages

### Speech Recognition Languages
🇸🇦 Arabic (AR), 🇨🇳 Chinese (ZH), 🇨🇿 Czech (CS), 🇩🇰 Danish (DA), 🇳🇱 Dutch (NL), 🇬🇧 English (EN), 🇫🇮 Finnish (FI), 🇫🇷 French (FR), 🇩🇪 German (DE), 🇬🇷 Greek (EL), 🇮🇱 Hebrew (HE), 🇭🇺 Hungarian (HU), 🇮🇹 Italian (IT), 🇯🇵 Japanese (JA), 🇰🇷 Korean (KO), 🇵🇱 Polish (PL), 🇵🇹 Portuguese (PT), 🇷🇺 Russian (RU), 🇪🇸 Spanish (ES), 🇹🇷 Turkish (TR), 🇺🇦 Ukrainian (UK)

### Translation Languages
🇸🇦 Arabic (AR), 🇧🇬 Bulgarian (BG), 🇨🇳 Chinese Mandarin (ZH), 🇨🇿 Czech (CS), 🇩🇰 Danish (DA), 🇳🇱 Dutch (NL), 🇬🇧 English UK (EN_GB), 🇺🇸 English US (EN_US), 🇫🇮 Finnish (FI), 🇫🇷 French (FR), 🇩🇪 German (DE), 🇬🇷 Greek (EL), 🇮🇱 Hebrew (HE), 🇭🇺 Hungarian (HU), 🇮🇩 Indonesian (ID), 🇮🇹 Italian (IT), 🇯🇵 Japanese (JA), 🇰🇷 Korean (KO), 🇵🇱 Polish (PL), 🇵🇹 Portuguese (PT), 🇧🇷 Portuguese Brazilian (PT_BR), 🇷🇴 Romanian (RO), 🇷🇺 Russian (RU), 🇸🇰 Slovak (SK), 🇪🇸 Spanish (ES), 🇲🇽 Spanish Mexican (ES_MX), 🇸🇪 Swedish (SV), 🇹🇷 Turkish (TR), 🇺🇦 Ukrainian (UK), 🇻🇳 Vietnamese (VN)

## License

MIT