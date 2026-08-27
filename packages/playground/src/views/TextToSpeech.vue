<script setup lang="ts">
import {
  PalabraTtsClient,
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
import { apiKey } from '../auth';

let ttsClient: PalabraTtsClient | null = null;

const isSessionStarted = ref(false);
const isBusy = ref(false);
const isPlaying = ref(false);
const language = ref<TtsLangCode>('en');
const voiceId = ref('default_low');
const speed = ref(1.0);
const text = ref('Hello, how can I help you today?');
const lastError = ref('');
const lastGenerationId = ref('');

const languages = ttsLanguages.filter(item => !item.code.includes('-'));

onMounted(() => {
  ttsClient = new PalabraTtsClient({
    auth: {
      apiKey,
    },
    language: language.value,
    voiceOptions: {
      voice_id: voiceId.value,
      speed: speed.value,
    },
  });

  ttsClient.on(EVENT_TTS_SESSION_STARTED, () => {
    isSessionStarted.value = true;
  });

  ttsClient.on(EVENT_TTS_SESSION_STOPPED, () => {
    isSessionStarted.value = false;
    isPlaying.value = false;
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
});

onBeforeUnmount(async () => {
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

const startSession = () => run(async () => {
  await ttsClient?.startSession();
  await ttsClient?.startPlayback();
});

const stopSession = () => run(async () => {
  await ttsClient?.stopSession();
});

const speak = () => run(async () => {
  await ttsClient?.speak(text.value);
});

const cancel = () => run(async () => {
  await ttsClient?.cancel();
});

const changeLanguage = () => run(async () => {
  await ttsClient?.setLanguage(language.value);
});

const changeVoice = () => run(async () => {
  await ttsClient?.setVoiceOptions({ voice_id: voiceId.value });
});

const changeSpeed = () => run(async () => {
  await ttsClient?.setVoiceOptions({ speed: Number(speed.value) });
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-center">Text To Speech</h2>
      <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-7">
        <p
          v-if="!apiKey"
          class="bg-yellow-100 text-yellow-800 rounded-md p-3 text-sm"
        >
          Add <code>VITE_PALABRA_API_KEY</code> to the <code>.env</code> file in the project root to run this example.
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
            <span class="text-sm text-gray-600">Voice</span>
            <select
              v-model="voiceId"
              :disabled="isBusy"
              class="w-full border rounded-md p-2 disabled:opacity-50"
              @change="changeVoice"
            >
              <option value="default_low">default_low</option>
              <option value="default_high">default_high</option>
            </select>
          </label>
          <label class="flex-1">
            <span class="text-sm text-gray-600">Speed: {{ speed }}</span>
            <input
              v-model.number="speed"
              :disabled="isBusy"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              class="w-full disabled:opacity-50"
              @change="changeSpeed"
            >
          </label>
        </div>

        <textarea
          v-model="text"
          rows="4"
          class="w-full border rounded-md p-3"
          placeholder="Text to synthesize"
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
          <p>Last finished generation: {{ lastGenerationId || '—' }}</p>
          <p
            v-if="lastError"
            class="text-red-500"
          >
            {{ lastError }}
          </p>
        </div>

        <div class="text-sm text-gray-600">
          <p>This example demonstrates:</p>
          <ul class="list-disc ml-6 mt-2">
            <li>Realtime TTS session over a websocket</li>
            <li>Streaming text and gapless playback of pcm chunks</li>
            <li>Cancelling the ongoing synthesis</li>
            <li>Changing the language, voice and speed (each restarts the session)</li>
            <li>Session state driven by the client events, errors shown instead of being swallowed</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
