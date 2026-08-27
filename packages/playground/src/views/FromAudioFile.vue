<script setup lang="ts">
import {
  PalabraClient,
  EVENT_TRANSLATION_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  createTrackFromFile,
  PalabraApiClient,
} from '@palabra-ai/translator';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { palabraAuth, apiBaseUrl } from '../auth';

let palabraClient: PalabraClient | null = null;
const isTranslationStarted = ref(false);
const isAudioMuted = ref(false);

const transcriptionData = ref<string>('');
const translationData = ref<string>('');
const lastError = ref('');

const getAudioTrack = async (): Promise<MediaStreamTrack> => {
  const response = await fetch('/sample-en.wav');
  if (!response.ok) {
    throw new Error(`Failed to load the bundled sample clip: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const { track } = await createTrackFromFile(audioBlob, new AudioContext());

  return track;
};

onMounted(async () => {
  // Close any sessions left dangling by previous runs/reloads so the demo
  // never trips over the account's concurrent-session limit.
  try {
    const apiClient = new PalabraApiClient(palabraAuth, apiBaseUrl);
    const sessionsData = await apiClient.fetchActiveSessions();
    sessionsData?.data?.sessions?.forEach((session: { id: string }) => {
      apiClient.deleteStreamingSession(session.id);
    });
  } catch {
    // Best-effort cleanup; a failure here shouldn't block the demo.
  }

  palabraClient = new PalabraClient({
    auth: palabraAuth,
    translateFrom: 'en',
    translateTo: 'es',
    handleOriginalTrack: getAudioTrack,
    apiBaseUrl,
  });

  palabraClient.on(EVENT_PARTIAL_TRANSCRIPTION_RECEIVED, (data) => {
    if (data) {
      transcriptionData.value = data.transcription.text;
    }
  });

  palabraClient.on(EVENT_TRANSLATION_RECEIVED, (data) => {
    if (data) {
      translationData.value = data.transcription.text;
    }
  });
});

onBeforeUnmount(async () => {
  if (isTranslationStarted.value) {
    await palabraClient?.stopTranslation();
  }
  await palabraClient?.cleanup();
});

const startTranslation = async () => {
  lastError.value = '';
  try {
    isTranslationStarted.value = true;
    await palabraClient?.startTranslation();
    await palabraClient?.startPlayback();
  } catch (error: unknown) {
    isTranslationStarted.value = false;
    lastError.value = error instanceof Error ? error.message : String(error);
  }
};

const stopTranslation = async () => {
  isTranslationStarted.value = false;
  isAudioMuted.value = false;
  await palabraClient?.stopTranslation();
  reset();
  await palabraClient?.cleanup();
};

const toggleAudio = () => {
  if (!palabraClient) return;

  if (isAudioMuted.value) {
    palabraClient.unmuteOriginalTrack();
    isAudioMuted.value = false;
  } else {
    palabraClient.muteOriginalTrack();
    isAudioMuted.value = true;
  }
};

const reset = () => {
  transcriptionData.value = '';
  translationData.value = '';
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-center">Translator (from audio file)</h2>
      <p class="text-sm text-gray-600 mb-4 text-center">
        No microphone needed: plays the bundled English sample clip
        (<code>public/sample-en.wav</code>) and translates it to Spanish in real time.
        Swap the file to try your own audio.
      </p>
      <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-7">
        <div>
          <h3>Transcription:</h3>
          <p class="text-sm text-gray-600">{{ transcriptionData }}</p>
        </div>

        <div class="flex items-center gap-4 md:flex-row flex-col">
          <button
            :disabled="isTranslationStarted"
            class="flex-1 bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="startTranslation"
          >
            ▶︎ Translate the sample
          </button>
          <button
            :disabled="!isTranslationStarted"
            class="flex-1 bg-red-500 text-white p-3 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="stopTranslation"
          >
            Stop
          </button>
          <button
            :disabled="!isTranslationStarted"
            :class="isAudioMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'"
            class="flex-1 text-white p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            @click="toggleAudio"
          >
            {{ isAudioMuted ? '🔇 Unmute source' : '🔈 Mute source' }}
          </button>
        </div>
        <div>
          <h3>Translation:</h3>
          <p class="text-sm text-gray-600">{{ translationData }}</p>
        </div>
        <p v-if="lastError" class="text-sm text-red-500">{{ lastError }}</p>
        <div class="text-sm text-gray-600">
          <p>This example demonstrates:</p>
          <ul class="list-disc ml-6 mt-2">
            <li>Translating a file instead of a live microphone</li>
            <li><code>createTrackFromFile</code> turning a blob into a media track</li>
            <li>Cleaning up dangling sessions before starting a new one</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
