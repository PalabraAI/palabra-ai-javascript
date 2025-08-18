<script setup lang="ts">
import {
  PalabraClient,
  EVENT_TRANSLATION_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_REMOTE_TRACKS_UPDATE,
  createTrackFromFile,
  PalabraApiClient,
} from '@palabra-ai/translator';
import { onMounted, ref } from 'vue';

let palabraClient: PalabraClient | null = null;
const isTranslationStarted = ref(false);
const isMicrophoneMuted = ref(false);

const transcriptionData = ref<string>('');
const translationData = ref<string>('');

const getAudioTrack = async (): Promise<MediaStreamTrack> => {
  const audioUrl = new URL(`../../assets/track-1.test.mp3`, import.meta.url).href;
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to load audio file: ${response.statusText}`);
  }

  const audioBlob = await response.blob();

  const { track } = await createTrackFromFile(audioBlob, new AudioContext());

  return track;
};

onMounted(async () => {
  const apiClient = new PalabraApiClient({
    clientId: import.meta.env.VITE_PALABRA_CLIENT_ID,
    clientSecret: import.meta.env.VITE_PALABRA_CLIENT_SECRET,
  }, import.meta.env.VITE_PALABRA_ENDPOINT)

  const sessionsData = await apiClient.fetchActiveSessions();

  sessionsData?.data?.sessions?.forEach((session: any) => {
    apiClient.deleteStreamingSession(session.id);
  });
  

  palabraClient = new PalabraClient({
    auth: {
      clientId: import.meta.env.VITE_PALABRA_CLIENT_ID,
      clientSecret: import.meta.env.VITE_PALABRA_CLIENT_SECRET,
    },
    translateFrom: 'en',
    translateTo: 'en-us',
    handleOriginalTrack: getAudioTrack,
    apiBaseUrl: import.meta.env.VITE_PALABRA_ENDPOINT,
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

  palabraClient.on(EVENT_REMOTE_TRACKS_UPDATE, (data) => {
    console.log('Remote tracks updated:', data);
  });
});

const startTranslation = async () => {
  isTranslationStarted.value = true;
  await palabraClient?.startTranslation();
  await palabraClient?.startPlayback();
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
      <h2 class="text-2xl font-bold mb-6 text-center">Basic Translator Example (from audio file)</h2>
      <p class="text-sm text-gray-600">
        This example demonstrates how to translate audio from a file. 
        <br>
        <span class="text-sm text-red-600">
          Put your audio file in the <code>assets</code> folder and name it <code>track-1.test.mp3</code>.
          Do not forget setup language in the <code>translateFrom</code> and <code>translateTo</code> fields based on the audio file.
        </span>
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
        <div class="mb-14">
          <h3>Translation:</h3>
          <p class="text-sm text-gray-600">{{ translationData }}</p>
        </div>
        <div class="text-sm text-gray-600">
          <p>This is a basic example demonstrating:</p>
          <ul class="list-disc ml-6 mt-2">
            <li>Starting/stopping translation</li>
            <li>Microphone muting</li>
            <li>Basic error handling</li>
            <li>Transcription and translation data</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>