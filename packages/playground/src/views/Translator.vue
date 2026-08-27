<script setup lang="ts">
import {
  getLocalAudioTrack,
  PalabraClient,
  EVENT_TRANSLATION_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
} from '@palabra-ai/translator';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { palabraAuth, apiBaseUrl } from '../auth';

let palabraClient: PalabraClient | null = null;
const isTranslationStarted = ref(false);
const isMicrophoneMuted = ref(false);

const transcriptionData = ref<string>('');
const translationData = ref<string>('');
const lastError = ref('');

onMounted(() => {
  palabraClient = new PalabraClient({
    auth: palabraAuth,
    translateFrom: 'en',
    translateTo: 'es',
    handleOriginalTrack: getLocalAudioTrack,
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
  isMicrophoneMuted.value = false;
  await palabraClient?.stopTranslation();
  reset();
  await palabraClient?.cleanup();
};

const toggleMicrophone = () => {
  if (!palabraClient) return;

  if (isMicrophoneMuted.value) {
    palabraClient.unmuteOriginalTrack();
    isMicrophoneMuted.value = false;
  } else {
    palabraClient.muteOriginalTrack();
    isMicrophoneMuted.value = true;
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
      <h2 class="text-2xl font-bold mb-6 text-center">Live Translator (microphone)</h2>
      <p class="text-sm text-gray-600 mb-4 text-center">
        Speak English into your microphone — translated Spanish speech plays back within a second.
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
            Start Translation
          </button>
          <button
            :disabled="!isTranslationStarted"
            class="flex-1 bg-red-500 text-white p-3 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="stopTranslation"
          >
            Stop Translation
          </button>
          <button
            :disabled="!isTranslationStarted"
            :class="isMicrophoneMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'"
            class="flex-1 text-white p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            @click="toggleMicrophone"
          >
            {{ isMicrophoneMuted ? '🔇 Unmute microphone' : '🎤 Mute microphone' }}
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
            <li>Real-time speech-to-speech translation over WebRTC</li>
            <li>Starting/stopping the session, microphone muting</li>
            <li>Live transcription and translation text</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
