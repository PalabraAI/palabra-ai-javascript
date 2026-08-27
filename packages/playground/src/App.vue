<script setup lang="ts">
import { ref } from 'vue';
import { hasApiKey } from './auth';
import Translator from './views/Translator.vue';
import FromAudioFile from './views/FromAudioFile.vue';
import SpeechToText from './views/SpeechToText.vue';
import TextToSpeech from './views/TextToSpeech.vue';

const tabs = [
  { id: 'translator', label: 'Translator', component: Translator },
  { id: 'from-audio-file', label: 'From Audio File', component: FromAudioFile },
  { id: 'speech-to-text', label: 'Speech to Text', component: SpeechToText },
  { id: 'text-to-speech', label: 'Text to Speech', component: TextToSpeech },
] as const;

const activeTab = ref<(typeof tabs)[number]['id']>('translator');
</script>

<template>
  <div v-if="!hasApiKey" class="min-h-screen flex items-center justify-center px-4">
    <div class="max-w-xl bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-2xl font-bold mb-4">🎙️ Palabra Playground</h1>
      <p class="bg-yellow-100 text-yellow-800 rounded-md p-3 text-sm mb-4">
        No API key configured — the playground can't reach the Palabra API.
      </p>
      <p class="text-sm text-gray-700 mb-2">
        Create a <code class="bg-gray-100 px-1 rounded">.env</code> file in the project root with:
      </p>
      <pre class="bg-gray-900 text-gray-100 rounded-md p-3 text-sm mb-4">VITE_PALABRA_API_KEY=&lt;your key&gt;</pre>
      <p class="text-sm text-gray-700">
        Get a key at
        <a href="https://platform.palabra.ai/api-keys" class="text-blue-600 underline" target="_blank" rel="noreferrer">platform.palabra.ai/api-keys</a>,
        then restart the dev server (<code class="bg-gray-100 px-1 rounded">npm run dev</code>).
      </p>
    </div>
  </div>

  <div v-else class="min-h-screen">
    <header class="flex items-center justify-between px-6 py-4 bg-white shadow-md sticky top-0 z-10 md:flex-row flex-col gap-3">
      <div class="text-xl font-bold text-blue-600">🎙️ Palabra Playground</div>
      <nav class="flex items-center gap-2 flex-wrap justify-center">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-4 py-2 rounded-md transition-colors text-sm"
          :class="activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>
    <main>
      <template v-for="tab in tabs" :key="tab.id">
        <component :is="tab.component" v-if="activeTab === tab.id" />
      </template>
    </main>
    <footer class="text-center text-xs text-gray-500 pb-6">
      Sessions and usage:
      <a href="https://platform.palabra.ai/usage" class="underline" target="_blank" rel="noreferrer">platform.palabra.ai/usage</a>
      · Docs:
      <a href="https://docs.palabra.ai" class="underline" target="_blank" rel="noreferrer">docs.palabra.ai</a>
    </footer>
  </div>
</template>
