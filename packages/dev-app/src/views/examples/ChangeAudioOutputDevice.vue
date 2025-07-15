<script setup lang="ts">
import {
  getLocalAudioTrack,
  PalabraClient,
  EVENT_TRANSLATION_RECEIVED,
  EVENT_PARTIAL_TRANSCRIPTION_RECEIVED,
  EVENT_REMOTE_TRACKS_UPDATE,
  EVENT_DATA_RECEIVED,
  getAudioOutputDevices,
  PalabraApiClient,
} from '@palabra-ai/translator';
import { onMounted, ref, watch } from 'vue';
import VolumeChanger from '@/components/VolumeChanger.vue';

let palabraClient: PalabraClient | null = null;
const isTranslationStarted = ref(false);
const isMicrophoneMuted = ref(false);

const transcriptionData = ref<string>('');
const translationData = ref<string>('');
const audioOutputDevice = ref<string>('default');
const audioOutputDevices = ref<MediaDeviceInfo[]>([]);

const buttonClass = 'flex-1 text-white p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed';
const clearSessions = async () => {
  const apiClient = new PalabraApiClient({
      clientId: import.meta.env.VITE_PALABRA_CLIENT_ID,
      clientSecret: import.meta.env.VITE_PALABRA_CLIENT_SECRET,
  }, import.meta.env.VITE_PALABRA_ENDPOINT);

  const sessions = await apiClient.fetchActiveSessions();
  sessions?.data?.sessions?.forEach(session => {
    apiClient.deleteStreamingSession(session.id);
  });
}

const handleClientEvents = () => {
  if (!palabraClient) return;

  palabraClient.on(EVENT_DATA_RECEIVED, (data) => {
    console.log('Data received:', data);
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

  palabraClient.on(EVENT_DATA_RECEIVED, (data) => {
      console.log('Data received EVENT_DATA_RECEIVED:', data);
  });
}

watch(audioOutputDevice, async (newVal) => {
  console.log('audioOutputDevice', newVal);
  if (palabraClient) {
    await palabraClient.changeAudioOutputDevice(newVal);
  }
});

onMounted(async () => {
  audioOutputDevices.value = await getAudioOutputDevices();

  await clearSessions();
 
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

  handleClientEvents();
});

const startTranslation = async () => {
  try {
    isTranslationStarted.value = true;
    await palabraClient?.startTranslation();
    await palabraClient?.startPlayback();
  } catch (error) {
    await stopTranslation();
    alert(error);
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
    <div class="max-w-2xl mx-auto flex flex-col gap-4">
      <h2 class="text-2xl font-bold mb-6 text-center">Basic Translator Example</h2>

      

      <div class="flex flex-col gap-4 shadow-md p-6 rounded-lg">
        <h1>Change Audio Output Device</h1>
        <select v-model="audioOutputDevice" class="w-full p-2 rounded-md border border-gray-300">
          <option v-for="device in audioOutputDevices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
        </select>

        <VolumeChanger v-if="isTranslationStarted && palabraClient" :client="palabraClient" language="es" />
      </div>
      <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-7">
        <div>
          <h3>Transcription:</h3>
          <p class="text-sm text-gray-600">{{ transcriptionData }}</p>
        </div>

        <div class="flex items-center gap-4 md:flex-row flex-col">
          <button
            :disabled="isTranslationStarted"
            :class="buttonClass"
            class="bg-blue-500 hover:bg-blue-600"
            @click="startTranslation"
          >
            Start Translation
          </button>
          <button
            :disabled="!isTranslationStarted"
            :class="buttonClass"
            class="bg-red-500 hover:bg-red-600"
            @click="stopTranslation"
          >
            Stop Translation
          </button>
          <button
            :disabled="!isTranslationStarted"
            :class="[
              buttonClass,
              isMicrophoneMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
            ]"
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