# Palabra Test Application

This is a test application demonstrating the capabilities of the Palabra translation library. The application includes basic and advanced examples of real-time speech translation.

## Features

- Basic translator example with simple controls
- Advanced translator with multiple language support and real-time transcription/translation display
- Modern, responsive UI
- Easy-to-use interface

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `packages/dev-app` directory with the following content:
```env
VITE_PALABRA_CLIENT_ID=your_client_id
VITE_PALABRA_CLIENT_SECRET=your_client_secret
VITE_PALABRA_ENDPOINT=https://domain (optional)
```

Replace `your_client_id` and `your_client_secret` with your actual Palabra API credentials.

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is busy).

## Available Examples

1. **Basic Translator**
   - Simple translation interface
   - Start/Stop translation
   - Microphone control
   - Real-time transcription display
   - Real-time translation display

2. **Advanced Translator**
   - Multiple language support
   - Real-time transcription display
   - Real-time translation display
   - Dynamic language switching
   - Advanced error handling

3. **Text To Speech** (`/text-to-speech`)
   - Realtime TTS session over a websocket
   - Streaming text and gapless playback of `pcm` chunks
   - Cancelling the ongoing synthesis
   - Language, voice and speed switching
   - Requires `VITE_PALABRA_API_KEY`

4. **Text To Speech → Audio Element** (`/text-to-speech-audio-element`)
   - Speech track from `getSpeechTrack()` attached to an `<audio>` element instead of `startPlayback()`
   - Native element controls for volume, mute and pause
   - Output device routing with `setSinkId`
   - Requires `VITE_PALABRA_API_KEY`

5. **Speech To Text** (`/speech-to-text`)
   - Realtime STT session over a websocket
   - Microphone captured into 320 ms `pcm_s16le` chunks
   - Partial results live, final ones appended to the transcript
   - Optional translation of the final transcriptions
   - Requires `VITE_PALABRA_API_KEY`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_PALABRA_CLIENT_ID` | Your Palabra API client ID |
| `VITE_PALABRA_CLIENT_SECRET` | Your Palabra API client secret |
| `VITE_PALABRA_ENDPOINT` | Your API url (optional) |
| `VITE_PALABRA_API_KEY` | Your Palabra API key, used by the Text To Speech example |

To obtain these credentials, please contact the Palabra team. 