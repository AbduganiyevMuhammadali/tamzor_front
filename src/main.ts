import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { rejimStore } from './stores/rejim'
import { vMaydon } from './validation/useForma'

// Biznes rejimi (distributsiya | optom) menyu va yo'naltirishdan oldin aniq bo'lishi kerak
rejimStore.yukla().finally(() => {
  createApp(App).use(router).directive('maydon', vMaydon).mount('#app')
})
