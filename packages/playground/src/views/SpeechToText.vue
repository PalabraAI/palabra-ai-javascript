<script setup lang="ts">
import {
  PalabraAsrClient,
  getLocalAudioTrack,
  asrLanguages,
  EVENT_ASR_DISCONNECTED,
  EVENT_ASR_ERROR_RECEIVED,
  EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_SESSION_STARTED,
  EVENT_ASR_SESSION_STOPPED,
  EVENT_ASR_TRANSCRIPTION_RECEIVED,
  EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED,
  type AsrLangCode,
  type AsrTargetLangCode,
} from '@palabra-ai/translator';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { apiKey } from '../auth';

let asrClient: PalabraAsrClient | null = null;

const isTranscribing = ref(false);
const isBusy = ref(false);
const isMuted = ref(false);
const language = ref<AsrLangCode>('auto');
const translateTo = ref<AsrTargetLangCode | ''>('');
const partialText = ref('');
const transcript = ref<{ id: string, text: string }[]>([]);
const translations = ref<{ id: string, language: string, text: string }[]>([]);
const lastError = ref('');

const languages = asrLanguages;
const targetLanguages = asrLanguages.filter(item => item.code !== 'auto');

onMounted(() => {
  asrClient = new PalabraAsrClient({
    auth: {
      apiKey,
    },
    language: language.value,
    handleOriginalTrack: getLocalAudioTrack,
  });

  asrClient.on(EVENT_ASR_SESSION_STARTED, () => {
    isTranscribing.value = true;
  });

  asrClient.on(EVENT_ASR_SESSION_STOPPED, () => {
    isTranscribing.value = false;
    isMuted.value = false;
    partialText.value = '';
  });

  asrClient.on(EVENT_ASR_PARTIAL_TRANSCRIPTION_RECEIVED, (data) => {
    if (data) {
      partialText.value = data.segment.text;
    }
  });

  asrClient.on(EVENT_ASR_TRANSCRIPTION_RECEIVED, (data) => {
    if (!data) return;
    partialText.value = '';
    transcript.value = [...transcript.value, { id: data.transcription_id, text: data.segment.text }];
  });

  asrClient.on(EVENT_ASR_TRANSLATED_TRANSCRIPTION_RECEIVED, (data) => {
    if (!data) return;
    translations.value = [...translations.value, {
      id: `${data.transcription_id}-${data.language}`,
      language: data.language,
      text: data.segment.text,
    }];
  });

  asrClient.on(EVENT_ASR_ERROR_RECEIVED, (error) => {
    lastError.value = error.message;
  });

  asrClient.on(EVENT_ASR_DISCONNECTED, ({ code, reason }) => {
    if (code !== 1000) {
      lastError.value = `Stream closed: ${code} ${reason}`;
    }
  });
});

onBeforeUnmount(async () => {
  await asrClient?.cleanup();
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

const startTranscription = () => run(async () => {
  transcript.value = [];
  translations.value = [];
  await asrClient?.startTranscription();
});

const stopTranscription = () => run(async () => {
  await asrClient?.stopTranscription();
});

const toggleMicrophone = () => {
  if (!asrClient) return;

  if (isMuted.value) {
    asrClient.unmuteOriginalTrack();
  } else {
    asrClient.muteOriginalTrack();
  }

  isMuted.value = asrClient.isOriginalTrackMuted();
};

const changeLanguage = () => run(async () => {
  await asrClient?.setLanguage(language.value);
});

const changeTranslateLanguages = () => run(async () => {
  await asrClient?.setTranslateLanguages(translateTo.value ? [translateTo.value] : []);
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-center">Speech To Text</h2>
      <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-7">
        <p
          v-if="!apiKey"
          class="bg-yellow-100 text-yellow-800 rounded-md p-3 text-sm"
        >
          Add <code>VITE_PALABRA_API_KEY</code> to the <code>.env</code> file in the project root to run this example.
        </p>

        <div class="flex gap-4 md:flex-row flex-col">
          <label class="flex-1">
            <span class="text-sm text-gray-600">Spoken language</span>
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
            <span class="text-sm text-gray-600">Translate to</span>
            <select
              v-model="translateTo"
              :disabled="isBusy"
              class="w-full border rounded-md p-2 disabled:opacity-50"
              @change="changeTranslateLanguages"
            >
              <option value="">
                — none —
              </option>
              <option
                v-for="item in targetLanguages"
                :key="item.code"
                :value="item.code"
              >
                {{ item.flag }} {{ item.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="flex items-center gap-4 md:flex-row flex-col">
          <button
            :disabled="isTranscribing || isBusy || !apiKey"
            class="flex-1 bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="startTranscription"
          >
            Start Transcription
          </button>
          <button
            :disabled="!isTranscribing || isBusy"
            :class="isMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'"
            class="flex-1 text-white p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            @click="toggleMicrophone"
          >
            {{ isMuted ? '🔇 Unmute microphone' : '🎤 Mute microphone' }}
          </button>
          <button
            :disabled="!isTranscribing || isBusy"
            class="flex-1 bg-red-500 text-white p-3 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="stopTranscription"
          >
            Stop Transcription
          </button>
        </div>

        <div>
          <h3 class="font-semibold">
            Transcript
          </h3>
          <p
            v-for="line in transcript"
            :key="line.id"
            class="text-sm text-gray-800"
          >
            {{ line.text }}
          </p>
          <p class="text-sm text-gray-400 italic">
            {{ partialText }}
          </p>
        </div>

        <div v-if="translations.length">
          <h3 class="font-semibold">
            Translations
          </h3>
          <p
            v-for="line in translations"
            :key="line.id"
            class="text-sm text-gray-800"
          >
            <span class="uppercase text-gray-500">{{ line.language }}</span> {{ line.text }}
          </p>
        </div>

        <div class="text-sm text-gray-600">
          <p>Session: {{ isTranscribing ? 'transcribing' : 'stopped' }}{{ isBusy ? ' (busy…)' : '' }}</p>
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
            <li>Realtime STT session over a websocket</li>
            <li>Microphone captured into 320 ms <code>pcm_s16le</code> chunks</li>
            <li>Partial results updated live, final ones appended to the transcript</li>
            <li>Optional translation of the final transcriptions</li>
            <li>Language changes restart the session, the API takes its config from the query</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
