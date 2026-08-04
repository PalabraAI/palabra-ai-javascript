import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BasicTranslator from '../views/examples/BasicTranslator.vue'
import AdvancedTranslator from '../views/examples/AdvancedTranslator.vue'
import AudioElement from '../views/examples/AudioElement.vue'
import FromAudioFile from '../views/examples/FromAudioFile.vue'
import ChangeAudioOutputDevice from '@/views/examples/ChangeAudioOutputDevice.vue'
import TextToSpeech from '@/views/examples/TextToSpeech.vue'
import TextToSpeechAudioElement from '@/views/examples/TextToSpeechAudioElement.vue'
import SpeechToText from '@/views/examples/SpeechToText.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      children: [
        {
          path: '/',
          name: 'basic-translator',
          component: BasicTranslator
        },
        {
          path: '/advanced',
          name: 'advanced-translator',
          component: AdvancedTranslator
        },
        {
          path: '/audio-element',
          name: 'audio-element',
          component: AudioElement
        },
        {
          path: '/from-audio-file',
          name: 'from-audio-file',
          component: FromAudioFile
        },
        {
          path: '/change-audio-output-device',
          name: 'change-audio-output-device',
          component: ChangeAudioOutputDevice
        },
        {
          path: '/text-to-speech',
          name: 'text-to-speech',
          component: TextToSpeech
        },
        {
          path: '/text-to-speech-audio-element',
          name: 'text-to-speech-audio-element',
          component: TextToSpeechAudioElement
        },
        {
          path: '/speech-to-text',
          name: 'speech-to-text',
          component: SpeechToText
        }
      ]
    },
  ]
})

export default router
