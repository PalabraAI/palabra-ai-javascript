import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BasicTranslator from '../views/examples/BasicTranslator.vue'
import AdvancedTranslator from '../views/examples/AdvancedTranslator.vue'
import AudioElement from '../views/examples/AudioElement.vue'

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
        }
      ]
    },
  ]
})

export default router
