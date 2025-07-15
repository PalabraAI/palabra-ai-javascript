<script async setup lang="ts">
import {
  getLocalAudioTrack,
  PalabraClient,
  EVENT_TRANSLATION_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  type PalabraClientData,
} from '@palabra-ai/translator';
import { onMounted, ref } from 'vue';
import VolumeChanger from '@/components/VolumeChanger.vue';

let palabraClient: PalabraClient | null = null;

const isTranslationStarted = ref(false);
const isMicrophoneMuted = ref(false);

const transcriptionData = ref<string>('');
const translationData = ref<string>('');

onMounted(async () => {
  palabraClient = new PalabraClient({
    auth: {
      clientId: import.meta.env.VITE_PALABRA_CLIENT_ID,
      clientSecret: import.meta.env.VITE_PALABRA_CLIENT_SECRET,
    },
    translateFrom: 'en',
    translateTo: 'es',
    handleOriginalTrack: getLocalAudioTrack,
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
  console.log('🛑 stopTranslation() called.');
};

const toggleMicrophone = () => {
  if (isMicrophoneMuted.value) {
    palabraClient?.unmuteOriginalTrack();
    isMicrophoneMuted.value = false;
    console.log('🎤 Microphone unmuted');
  } else {
    palabraClient?.muteOriginalTrack();
    isMicrophoneMuted.value = true;
    console.log('🔇 Microphone muted');
  }
};

const addTranslation = () => {
  if (palabraClient) {
    palabraClient.addTranslationTarget('fr');
  }
};

const removeTranslation = () => {
  if (palabraClient) {
    palabraClient.removeTranslationTarget('fr');
  }
};

const playTranslation = async () => {
  if (palabraClient) {
    await palabraClient.startPlayback();
  }
};

const stopPlayback = async () => {
  if (palabraClient) {
    await palabraClient.stopPlayback();
  }
};

const setTranslateFrom = async (code: PalabraClientData['translateFrom']) => {
  if (palabraClient) {
    await palabraClient.setTranslateFrom(code);
  }
};

const setTranslateTo = async (code: PalabraClientData['translateTo']) => {
  if (palabraClient) {
    await palabraClient.setTranslateTo(code);
  }
};
</script>

<template>
  <main class="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
    <h2 class="text-2xl font-bold mb-6 text-center">Advanced Translator Example</h2>
    <div v-if="isTranslationStarted && palabraClient">
      <VolumeChanger :client="palabraClient" language="es" />
      <VolumeChanger :client="palabraClient" language="fr" />
    </div>
    <div>
      <h2>Transcription:</h2>
      <p>{{ transcriptionData }}</p>
    </div>

    <div class="flex gap-2">
      <button
        class="bg-blue-500 text-white p-2 rounded-md cursor-pointer hover:bg-blue-600"
        @click="setTranslateFrom('ru')"
      >
        Set Translate From (ru)
      </button>
      <button
        class="bg-blue-500 text-white p-2 rounded-md cursor-pointer hover:bg-blue-600"
        @click="setTranslateTo('de')"
      >
        Set Translate To (de)
      </button>
    </div>

    <div class="flex gap-2">
      <button
        :disabled="isTranslationStarted"
        class="bg-blue-500 text-white p-2 rounded-md cursor-pointer hover:bg-blue-600"
        @click="startTranslation"
      >
        Start Translation
      </button>
      <button
        :disabled="!isTranslationStarted"
        class="bg-red-500 text-white p-2 rounded-md cursor-pointer hover:bg-red-600"
        @click="stopTranslation"
      >
        Stop Translation
      </button>
      <button
        :disabled="!isTranslationStarted"
        :class="isMicrophoneMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'"
        class="text-white p-2 rounded-md cursor-pointer"
        @click="toggleMicrophone"
      >
        {{ isMicrophoneMuted ? '🔇 Unmute' : '🎤 Mute' }}
      </button>
      <button
        class="bg-green-500 text-white p-2 rounded-md cursor-pointer hover:bg-green-600"
        @click="addTranslation"
      >
        Add Translation
      </button>
      <button
        class="bg-yellow-500 text-white p-2 rounded-md cursor-pointer hover:bg-yellow-600"
        @click="removeTranslation"
      >
        Remove Translation
      </button>

      <button
        class="bg-purple-500 text-white p-2 rounded-md cursor-pointer hover:bg-purple-600"
        @click="playTranslation"
      >
        Play Translation
      </button>
      <button
        class="bg-purple-500 text-white p-2 rounded-md cursor-pointer hover:bg-purple-600"
        @click="stopPlayback"
      >
        Stop Playback
      </button>
    </div>
    <div>
      <h2>Translation:</h2>
      <p>{{ translationData }}</p>
    </div>
  </main>
</template>

<style>
button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>