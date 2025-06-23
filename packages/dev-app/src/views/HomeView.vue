<script async setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <header class="flex items-center justify-between px-6 py-4 bg-white shadow-md sticky top-0 z-10">
    <div class="flex items-center">
      <div class="text-2xl font-bold text-blue-600 flex items-center">
        <img
          src="@/assets/logo.svg"
          alt="Palabra Logo"
          class="w-10 h-10 mr-2"
        >
        <span class="text-2xl font-bold text-blue-600 -mt-2">Palabra.ai</span>
      </div>
    </div>
    <nav class="flex items-center md:flex-row flex-col">
      <router-link
        to="/"
        class="mx-4 px-4 py-2 rounded-md transition-colors"
        :class="route.path === '/' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'"
      >
        Basic Example
      </router-link>
      <router-link
        to="/audio-element"
        class="mx-4 px-4 py-2 rounded-md transition-colors"
        :class="route.path === '/audio-element' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'"
      >
        Audio Element Example
      </router-link>
      <router-link
        to="/advanced"
        class="mx-4 px-4 py-2 rounded-md transition-colors"
        :class="route.path === '/advanced' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'"
      >
        Advanced Example
      </router-link>
    </nav>
  </header>
  <main class="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
    <RouterView />
  </main>
</template>