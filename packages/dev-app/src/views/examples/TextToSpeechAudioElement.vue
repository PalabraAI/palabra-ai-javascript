<script setup lang="ts">
import {
  PalabraTtsClient,
  getAudioOutputDevices,
  ttsLanguages,
  EVENT_TTS_ERROR_RECEIVED,
  EVENT_TTS_GENERATION_COMPLETED,
  EVENT_TTS_PLAYBACK_ENDED,
  EVENT_TTS_PLAYBACK_STARTED,
  EVENT_TTS_SESSION_STARTED,
  EVENT_TTS_SESSION_STOPPED,
  type TtsLangCode,
} from '@palabra-ai/translator';
import { onMounted, onBeforeUnmount, ref } from 'vue';

const apiKey = import.meta.env.VITE_PALABRA_API_KEY || import.meta.env.VITE_PALABRA_API_TOKEN || '';

let ttsClient: PalabraTtsClient | null = null;
let audioContext: AudioContext | null = null;

const audioElement = ref<HTMLAudioElement | null>(null);
const isSessionStarted = ref(false);
const isBusy = ref(false);
const isPlaying = ref(false);
const language = ref<TtsLangCode>('en');
const text = ref('This speech is routed into an audio element instead of the default output.');
const lastError = ref('');
const lastGenerationId = ref('');
const trackId = ref('');
const audioOutputDevice = ref('default');
const audioOutputDevices = ref<MediaDeviceInfo[]>([]);

const languages = ttsLanguages.filter(item => !item.code.includes('-'));

onMounted(async () => {
  audioContext = new AudioContext();

  ttsClient = new PalabraTtsClient({
    auth: {
      apiKey,
    },
    language: language.value,
    audioContext,
  });

  ttsClient.on(EVENT_TTS_SESSION_STARTED, () => {
    isSessionStarted.value = true;
  });

  ttsClient.on(EVENT_TTS_SESSION_STOPPED, () => {
    isSessionStarted.value = false;
    isPlaying.value = false;
    trackId.value = '';
  });

  ttsClient.on(EVENT_TTS_PLAYBACK_STARTED, () => {
    isPlaying.value = true;
  });

  ttsClient.on(EVENT_TTS_PLAYBACK_ENDED, () => {
    isPlaying.value = false;
  });

  ttsClient.on(EVENT_TTS_GENERATION_COMPLETED, ({ generationId }) => {
    lastGenerationId.value = generationId;
  });

  ttsClient.on(EVENT_TTS_ERROR_RECEIVED, (data) => {
    lastError.value = data ? `${data.code}: ${data.desc}` : '';
  });

  audioOutputDevices.value = await getAudioOutputDevices();
});

onBeforeUnmount(async () => {
  detachTrack();
  await ttsClient?.cleanup();
});

const run = async (action: () => Promise<unknown>) => {
  isBusy.value = true;
  lastError.value = '';

  try {
    await action();
  } catch (error: unknown) {
    lastError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isBusy.value = false;
  }
};

const attachTrack = async () => {
  const track = ttsClient?.getSpeechTrack();

  if (!track || !audioElement.value) {
    throw new Error('No speech track available');
  }

  trackId.value = track.id;
  audioElement.value.pause();
  audioElement.value.srcObject = new MediaStream([track]);
  await audioElement.value.play();
};

const detachTrack = () => {
  if (!audioElement.value) return;
  audioElement.value.pause();
  audioElement.value.srcObject = null;
};

const startSession = () => run(async () => {
  await ttsClient?.startSession();
  await attachTrack();
});

const stopSession = () => run(async () => {
  detachTrack();
  await ttsClient?.stopSession();
});

const speak = () => run(async () => {
  await attachTrack();
  await ttsClient?.speak(text.value);
});

const cancel = () => run(async () => {
  await ttsClient?.cancel();
});

const changeLanguage = () => run(async () => {
  await ttsClient?.setLanguage(language.value);

  if (isSessionStarted.value) {
    await attachTrack();
  }
});

const changeAudioOutputDevice = () => run(async () => {
  if (!audioElement.value?.setSinkId) {
    throw new Error('setSinkId is not supported in this browser');
  }

  await audioElement.value.setSinkId(audioOutputDevice.value);
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-center">Text To Speech → Audio Element</h2>
      <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-7">
        <p
          v-if="!apiKey"
          class="bg-yellow-100 text-yellow-800 rounded-md p-3 text-sm"
        >
          Add <code>VITE_PALABRA_API_KEY</code> to <code>packages/dev-app/.env</code> to run this example.
        </p>

        <div class="flex gap-4 md:flex-row flex-col">
          <label class="flex-1">
            <span class="text-sm text-gray-600">Language</span>
            <select
              v-model="language"
              :disabled="isBusy"
              class="w-full border rounded-md p-2 disabled:opacity-50"
              @change="changeLanguage"
            >
              <option
                v-for="item in languages"
                :key="item.code"
                :value="item.code"
              >
                {{ item.flag }} {{ item.label }}
              </option>
            </select>
          </label>
          <label class="flex-1">
            <span class="text-sm text-gray-600">Output device</span>
            <select
              v-model="audioOutputDevice"
              :disabled="isBusy"
              class="w-full border rounded-md p-2 disabled:opacity-50"
              @change="changeAudioOutputDevice"
            >
              <option
                v-for="device in audioOutputDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label || device.deviceId }}
              </option>
            </select>
          </label>
        </div>

        <textarea
          v-model="text"
          rows="4"
          class="w-full border rounded-md p-3"
          placeholder="Text to synthesize"
        />

        <audio
          ref="audioElement"
          controls
          class="w-full"
        />

        <div class="flex items-center gap-4 md:flex-row flex-col">
          <button
            :disabled="isSessionStarted || isBusy || !apiKey"
            class="flex-1 bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="startSession"
          >
            Start Session
          </button>
          <button
            :disabled="!isSessionStarted || isBusy || isPlaying"
            class="flex-1 bg-green-500 text-white p-3 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="speak"
          >
            🔊 Speak
          </button>
          <button
            :disabled="!isSessionStarted || isBusy"
            class="flex-1 bg-yellow-500 text-white p-3 rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="cancel"
          >
            ✋ Cancel
          </button>
          <button
            :disabled="!isSessionStarted || isBusy"
            class="flex-1 bg-red-500 text-white p-3 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="stopSession"
          >
            Stop Session
          </button>
        </div>

        <div class="text-sm text-gray-600">
          <p>Session: {{ isSessionStarted ? 'started' : 'stopped' }}{{ isBusy ? ' (busy…)' : '' }}</p>
          <p>Playback: {{ isPlaying ? 'playing' : 'idle' }}</p>
          <p>Speech track: {{ trackId || '—' }}</p>
          <p>Last finished generation: {{ lastGenerationId || '—' }}</p>
          <p
            v-if="lastError"
            class="text-red-500"
          >
            {{ lastError }}
          </p>
        </div>

        <div class="text-sm text-gray-600 mb-14">
          <p>This example demonstrates:</p>
          <ul class="list-disc ml-6 mt-2">
            <li>Playing the speech through an audio element instead of <code>startPlayback()</code></li>
            <li>Taking the track from <code>getSpeechTrack()</code> into <code>srcObject</code></li>
            <li>Native element controls for volume, mute and pause</li>
            <li>Routing the speech to a chosen output device with <code>setSinkId</code></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
