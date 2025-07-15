<script setup lang="ts">
import type { PalabraClient } from '@palabra-ai/translator';
import { ref, watch } from 'vue';

const props = defineProps<{
    client: PalabraClient;
    language: string;
}>();

const volume = ref(1);

watch(volume, (newVolume) => {
    props.client.setVolume(props.language, newVolume);
});
</script>

<template>
    <div>
        <input type="range" v-model="volume" min="0" max="1" step="0.01" />

        {{ Math.round(volume * 100) }} % [{{ language }}]
    </div>
</template>